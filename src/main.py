"""
FastAPI 메인 애플리케이션
Google Drive 웹훅을 수신하고 WhatsApp 알림을 전송합니다.
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
import uvicorn

from webhook_handler import WebhookHandler
from whatsapp_client import WhatsAppClient
from database import Database, NotificationLog

# 환경 변수 로드
load_dotenv('config/.env')

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# FastAPI 앱 초기화
app = FastAPI(
    title="GDrive-WhatsApp Notifier",
    description="구글 드라이브 파일 공유 시 WhatsApp 알림 자동화 시스템",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 의존성 주입
webhook_handler = WebhookHandler()
whatsapp_client = WhatsAppClient()
database = Database()


# Pydantic 모델 정의
class DriveEventPayload(BaseModel):
    """구글 드라이브 이벤트 페이로드"""
    eventType: str = Field(..., description="이벤트 타입")
    fileId: str = Field(..., description="파일 ID")
    fileName: str = Field(..., description="파일 이름")
    fileType: Optional[str] = Field(None, description="파일 타입")
    fileUrl: Optional[str] = Field(None, description="파일 URL")
    fileSize: Optional[int] = Field(None, description="파일 크기")
    thumbnailUrl: Optional[str] = Field(None, description="썸네일 URL")
    owner: Optional[str] = Field(None, description="파일 소유자")
    sharedBy: Optional[str] = Field(None, description="공유한 사람")
    editors: Optional[List[str]] = Field(default=[], description="편집자 목록")
    viewers: Optional[List[str]] = Field(default=[], description="보기 권한자 목록")
    timestamp: str = Field(..., description="이벤트 타임스탬프")
    apiKey: Optional[str] = Field(None, description="API 키")


class WhatsAppMessage(BaseModel):
    """WhatsApp 메시지 모델"""
    recipients: List[str] = Field(..., description="수신자 전화번호 목록")
    message: str = Field(..., description="메시지 내용")
    fileInfo: Optional[Dict[str, Any]] = Field(None, description="파일 정보")


class NotificationResponse(BaseModel):
    """알림 응답 모델"""
    success: bool
    message: str
    notificationId: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# API 키 검증
async def verify_api_key(request: Request):
    """API 키 검증 미들웨어"""
    api_key = request.headers.get("Authorization")
    expected_key = os.getenv("API_KEY")

    if not api_key or api_key.replace("Bearer ", "") != expected_key:
        logger.warning(f"Invalid API key attempt from {request.client.host}")
        raise HTTPException(status_code=401, detail="Invalid API key")

    return True


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("🚀 GDrive-WhatsApp Notifier 서버 시작")

    # 데이터베이스 초기화
    await database.initialize()

    # WhatsApp 클라이언트 초기화
    await whatsapp_client.initialize()

    logger.info("✅ 모든 서비스 초기화 완료")


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    logger.info("🛑 서버 종료 중...")

    # 연결 정리
    await database.close()
    await whatsapp_client.close()


@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "GDrive-WhatsApp Notifier",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/webhook/gdrive", response_model=NotificationResponse)
async def handle_drive_webhook(
    payload: DriveEventPayload,
    background_tasks: BackgroundTasks,
    authenticated: bool = Depends(verify_api_key)
):
    """
    구글 드라이브 웹훅 핸들러
    파일 공유 이벤트를 받아 WhatsApp 알림을 전송합니다.
    """
    try:
        logger.info(f"📨 웹훅 수신: {payload.eventType} - {payload.fileName}")

        # 이벤트 검증
        is_valid = await webhook_handler.validate_event(payload.dict())
        if not is_valid:
            logger.warning(f"Invalid event received: {payload.eventType}")
            return NotificationResponse(
                success=False,
                message="Invalid event type or payload"
            )

        # 수신자 결정
        recipients = await webhook_handler.determine_recipients(payload.dict())
        if not recipients:
            logger.warning("No recipients found for notification")
            return NotificationResponse(
                success=False,
                message="No recipients configured"
            )

        # 메시지 생성
        message = await webhook_handler.format_message(payload.dict())

        # WhatsApp 알림 전송 (백그라운드)
        background_tasks.add_task(
            send_whatsapp_notifications,
            recipients,
            message,
            payload.dict()
        )

        # 로그 저장
        notification_log = await database.save_notification(
            event_type=payload.eventType,
            file_name=payload.fileName,
            file_id=payload.fileId,
            recipients=recipients,
            status="pending"
        )

        return NotificationResponse(
            success=True,
            message=f"알림이 {len(recipients)}명에게 전송 중입니다",
            notificationId=str(notification_log.id),
            details={
                "eventType": payload.eventType,
                "fileName": payload.fileName,
                "recipientCount": len(recipients)
            }
        )

    except Exception as e:
        logger.error(f"웹훅 처리 중 에러: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/notify/manual", response_model=NotificationResponse)
async def send_manual_notification(
    message_data: WhatsAppMessage,
    background_tasks: BackgroundTasks,
    authenticated: bool = Depends(verify_api_key)
):
    """
    수동 WhatsApp 알림 전송
    테스트 또는 커스텀 메시지 전송용
    """
    try:
        logger.info(f"📱 수동 알림 요청: {len(message_data.recipients)}명")

        # 백그라운드에서 알림 전송
        background_tasks.add_task(
            send_whatsapp_notifications,
            message_data.recipients,
            message_data.message,
            message_data.fileInfo
        )

        return NotificationResponse(
            success=True,
            message=f"{len(message_data.recipients)}명에게 메시지 전송 중",
            details={
                "recipientCount": len(message_data.recipients)
            }
        )

    except Exception as e:
        logger.error(f"수동 알림 전송 중 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def send_whatsapp_notifications(
    recipients: List[str],
    message: str,
    file_info: Optional[Dict] = None
):
    """
    WhatsApp 알림 비동기 전송
    """
    success_count = 0
    failed_count = 0

    for recipient in recipients:
        try:
            # WhatsApp 메시지 전송
            result = await whatsapp_client.send_message(
                phone_number=recipient,
                message=message,
                media_url=file_info.get("thumbnailUrl") if file_info else None
            )

            if result["success"]:
                success_count += 1
                logger.info(f"✅ 알림 전송 성공: {recipient}")
            else:
                failed_count += 1
                logger.error(f"❌ 알림 전송 실패: {recipient} - {result.get('error')}")

        except Exception as e:
            failed_count += 1
            logger.error(f"알림 전송 에러 ({recipient}): {str(e)}")

    # 전송 결과 로그
    logger.info(f"📊 전송 완료 - 성공: {success_count}, 실패: {failed_count}")

    # 데이터베이스 업데이트
    await database.update_notification_status(
        success_count=success_count,
        failed_count=failed_count
    )


@app.get("/notifications/history")
async def get_notification_history(
    limit: int = 50,
    offset: int = 0,
    authenticated: bool = Depends(verify_api_key)
):
    """
    알림 히스토리 조회
    """
    try:
        notifications = await database.get_notifications(limit=limit, offset=offset)
        total = await database.get_total_notifications()

        return {
            "success": True,
            "total": total,
            "limit": limit,
            "offset": offset,
            "notifications": [n.to_dict() for n in notifications]
        }

    except Exception as e:
        logger.error(f"히스토리 조회 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_statistics(authenticated: bool = Depends(verify_api_key)):
    """
    시스템 통계 조회
    """
    try:
        stats = await database.get_statistics()
        return {
            "success": True,
            "statistics": stats,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"통계 조회 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/notifications/clear")
async def clear_old_notifications(
    days_old: int = 30,
    authenticated: bool = Depends(verify_api_key)
):
    """
    오래된 알림 로그 삭제
    """
    try:
        deleted_count = await database.clear_old_notifications(days_old)
        return {
            "success": True,
            "message": f"{deleted_count}개의 오래된 알림이 삭제되었습니다",
            "days_old": days_old
        }

    except Exception as e:
        logger.error(f"알림 삭제 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 핸들러"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )


if __name__ == "__main__":
    # 로그 디렉토리 생성
    os.makedirs("logs", exist_ok=True)

    # 서버 실행
    uvicorn.run(
        "main:app",
        host=os.getenv("SERVER_HOST", "0.0.0.0"),
        port=int(os.getenv("SERVER_PORT", 8000)),
        reload=os.getenv("ENVIRONMENT", "development") == "development",
        log_level="info"
    )