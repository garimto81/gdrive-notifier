"""
WhatsApp Business API 클라이언트
메시지 전송 및 미디어 처리를 담당합니다.
"""

import os
import aiohttp
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import asyncio
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv('config/.env')

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """WhatsApp Business API 클라이언트"""

    def __init__(self):
        """클라이언트 초기화"""
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        self.business_account_id = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID')
        self.api_version = 'v18.0'  # WhatsApp API 버전
        self.base_url = f'https://graph.facebook.com/{self.api_version}'

        # Twilio 대안 설정 (옵션)
        self.use_twilio = os.getenv('USE_TWILIO', 'false').lower() == 'true'
        if self.use_twilio:
            self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            self.twilio_whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER')

        self.session = None
        self.templates = self._load_message_templates()

    async def initialize(self):
        """비동기 초기화"""
        self.session = aiohttp.ClientSession()
        logger.info("✅ WhatsApp 클라이언트 초기화 완료")

        # API 연결 테스트
        await self._test_connection()

    async def close(self):
        """리소스 정리"""
        if self.session:
            await self.session.close()

    def _load_message_templates(self) -> Dict[str, str]:
        """메시지 템플릿 로드"""
        return {
            'file_shared': """🔔 *Google Drive 알림*

📁 새 파일이 공유되었습니다!

*파일명:* {fileName}
*공유자:* {sharedBy}
*유형:* {fileType}
*크기:* {fileSize}

🔗 *링크:* {fileUrl}

_이 메시지는 자동으로 전송되었습니다_""",

            'folder_shared': """🔔 *Google Drive 알림*

📂 폴더가 공유되었습니다!

*폴더명:* {fileName}
*공유자:* {sharedBy}

🔗 *링크:* {fileUrl}

_이 메시지는 자동으로 전송되었습니다_""",

            'permission_changed': """🔔 *Google Drive 알림*

⚙️ 파일 권한이 변경되었습니다

*파일명:* {fileName}
*변경자:* {sharedBy}
*새 권한:* {permission}

🔗 *링크:* {fileUrl}""",

            'test_message': """🧪 *테스트 메시지*

WhatsApp 연동이 정상적으로 작동합니다!

시간: {timestamp}
상태: ✅ 정상""",

            'custom': "{message}"
        }

    async def _test_connection(self):
        """API 연결 테스트"""
        try:
            if self.use_twilio:
                # Twilio 연결 테스트
                logger.info("Twilio WhatsApp API 사용 중")
            else:
                # Meta WhatsApp Business API 테스트
                url = f"{self.base_url}/{self.phone_number_id}"
                headers = {'Authorization': f'Bearer {self.access_token}'}

                async with self.session.get(url, headers=headers) as response:
                    if response.status == 200:
                        logger.info("✅ WhatsApp Business API 연결 성공")
                    else:
                        logger.error(f"❌ WhatsApp API 연결 실패: {response.status}")
        except Exception as e:
            logger.error(f"API 연결 테스트 실패: {str(e)}")

    async def send_message(
        self,
        phone_number: str,
        message: str,
        template_type: str = 'custom',
        template_data: Optional[Dict] = None,
        media_url: Optional[str] = None,
        buttons: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        WhatsApp 메시지 전송

        Args:
            phone_number: 수신자 전화번호 (국가 코드 포함)
            message: 메시지 내용
            template_type: 템플릿 타입
            template_data: 템플릿 변수 데이터
            media_url: 첨부할 미디어 URL
            buttons: 인터랙티브 버튼

        Returns:
            전송 결과 딕셔너리
        """
        try:
            # 전화번호 형식 정규화
            phone_number = self._normalize_phone_number(phone_number)

            # 템플릿 적용
            if template_type in self.templates:
                template = self.templates[template_type]
                if template_data:
                    message = template.format(**template_data)

            # 메시지 전송
            if self.use_twilio:
                result = await self._send_via_twilio(phone_number, message, media_url)
            else:
                result = await self._send_via_meta_api(phone_number, message, media_url, buttons)

            # 전송 로그
            if result['success']:
                logger.info(f"✅ 메시지 전송 성공: {phone_number}")
            else:
                logger.error(f"❌ 메시지 전송 실패: {phone_number} - {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"메시지 전송 에러: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def _send_via_meta_api(
        self,
        phone_number: str,
        message: str,
        media_url: Optional[str] = None,
        buttons: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Meta WhatsApp Business API를 통한 전송"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            # 메시지 페이로드 구성
            payload = {
                'messaging_product': 'whatsapp',
                'to': phone_number,
                'type': 'text',
                'text': {'body': message}
            }

            # 미디어 추가
            if media_url:
                payload['type'] = 'image'
                payload['image'] = {
                    'link': media_url,
                    'caption': message
                }
                del payload['text']

            # 인터랙티브 버튼 추가
            if buttons:
                payload['type'] = 'interactive'
                payload['interactive'] = {
                    'type': 'button',
                    'body': {'text': message},
                    'action': {'buttons': buttons}
                }
                if 'text' in payload:
                    del payload['text']

            # API 요청
            async with self.session.post(url, headers=headers, json=payload) as response:
                result = await response.json()

                if response.status == 200:
                    return {
                        'success': True,
                        'message_id': result.get('messages', [{}])[0].get('id'),
                        'status': 'sent',
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('error', {}).get('message', 'Unknown error'),
                        'error_code': result.get('error', {}).get('code'),
                        'timestamp': datetime.now().isoformat()
                    }

        except Exception as e:
            logger.error(f"Meta API 전송 에러: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def _send_via_twilio(
        self,
        phone_number: str,
        message: str,
        media_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Twilio API를 통한 WhatsApp 전송"""
        try:
            from twilio.rest import Client

            client = Client(self.twilio_account_sid, self.twilio_auth_token)

            # WhatsApp 번호 형식 조정
            to_number = f"whatsapp:{phone_number}"
            from_number = f"whatsapp:{self.twilio_whatsapp_number}"

            # 메시지 전송
            if media_url:
                message_instance = client.messages.create(
                    body=message,
                    from_=from_number,
                    to=to_number,
                    media_url=[media_url]
                )
            else:
                message_instance = client.messages.create(
                    body=message,
                    from_=from_number,
                    to=to_number
                )

            return {
                'success': True,
                'message_id': message_instance.sid,
                'status': message_instance.status,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Twilio 전송 에러: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def send_bulk_messages(
        self,
        recipients: List[str],
        message: str,
        template_type: str = 'custom',
        template_data: Optional[Dict] = None,
        delay_seconds: int = 1
    ) -> Dict[str, Any]:
        """
        대량 메시지 전송

        Args:
            recipients: 수신자 전화번호 리스트
            message: 메시지 내용
            template_type: 템플릿 타입
            template_data: 템플릿 데이터
            delay_seconds: 메시지 간 지연 시간

        Returns:
            전송 결과 요약
        """
        results = {
            'total': len(recipients),
            'success': 0,
            'failed': 0,
            'details': []
        }

        for recipient in recipients:
            try:
                # 메시지 전송
                result = await self.send_message(
                    phone_number=recipient,
                    message=message,
                    template_type=template_type,
                    template_data=template_data
                )

                if result['success']:
                    results['success'] += 1
                else:
                    results['failed'] += 1

                results['details'].append({
                    'recipient': recipient,
                    'result': result
                })

                # Rate limiting을 위한 지연
                await asyncio.sleep(delay_seconds)

            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'recipient': recipient,
                    'result': {'success': False, 'error': str(e)}
                })

        logger.info(f"대량 전송 완료: 성공 {results['success']}/{results['total']}")
        return results

    async def send_template_message(
        self,
        phone_number: str,
        template_name: str,
        language_code: str = 'ko',
        components: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        사전 승인된 템플릿 메시지 전송
        (WhatsApp Business 템플릿)
        """
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            payload = {
                'messaging_product': 'whatsapp',
                'to': phone_number,
                'type': 'template',
                'template': {
                    'name': template_name,
                    'language': {'code': language_code}
                }
            }

            if components:
                payload['template']['components'] = components

            async with self.session.post(url, headers=headers, json=payload) as response:
                result = await response.json()

                if response.status == 200:
                    return {
                        'success': True,
                        'message_id': result.get('messages', [{}])[0].get('id')
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('error', {}).get('message')
                    }

        except Exception as e:
            logger.error(f"템플릿 메시지 전송 에러: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """메시지 상태 조회"""
        try:
            url = f"{self.base_url}/{message_id}"
            headers = {'Authorization': f'Bearer {self.access_token}'}

            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'success': True,
                        'status': data.get('status'),
                        'delivered_at': data.get('delivered_at'),
                        'read_at': data.get('read_at')
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Failed to get message status'
                    }

        except Exception as e:
            logger.error(f"메시지 상태 조회 에러: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _normalize_phone_number(self, phone_number: str) -> str:
        """전화번호 형식 정규화"""
        # 특수문자 제거
        phone_number = ''.join(filter(str.isdigit, phone_number))

        # 한국 번호인 경우 국가 코드 추가
        if phone_number.startswith('010'):
            phone_number = '82' + phone_number[1:]
        elif not phone_number.startswith('82'):
            # 다른 국가 코드가 없는 경우 한국으로 가정
            if len(phone_number) == 10 or len(phone_number) == 11:
                phone_number = '82' + phone_number.lstrip('0')

        return phone_number

    async def validate_phone_number(self, phone_number: str) -> bool:
        """전화번호 유효성 검사"""
        try:
            normalized = self._normalize_phone_number(phone_number)
            # 기본적인 길이 검사
            if len(normalized) < 10 or len(normalized) > 15:
                return False
            return True
        except:
            return False

    async def create_contact(
        self,
        phone_number: str,
        name: str,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """연락처 생성/업데이트"""
        # 로컬 데이터베이스나 CRM에 저장하는 로직
        # 실제 구현은 프로젝트 요구사항에 따라 변경
        return {
            'success': True,
            'contact_id': f"contact_{phone_number}",
            'name': name,
            'phone_number': phone_number,
            'email': email
        }