# 📚 GDrive-WhatsApp Notifier 설치 가이드

## 📋 사전 준비사항

### 1. Google Cloud Platform 설정

#### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성
3. 프로젝트 ID 메모

#### 1.2 Google Drive API 활성화
```bash
# 또는 Console에서:
1. APIs & Services → Enable APIs
2. "Google Drive API" 검색
3. "ENABLE" 클릭
```

#### 1.3 OAuth 2.0 인증 설정
1. APIs & Services → Credentials
2. "+ CREATE CREDENTIALS" → OAuth client ID
3. Application type: Web application
4. Authorized redirect URIs 추가:
   - `http://localhost:8000/callback`
   - `https://your-domain.com/callback`
5. Client ID와 Client Secret 저장

#### 1.4 서비스 계정 생성 (선택사항)
```bash
1. APIs & Services → Credentials
2. "+ CREATE CREDENTIALS" → Service account
3. 서비스 계정 생성 후 키 다운로드 (JSON)
4. credentials.json으로 저장
```

### 2. WhatsApp Business API 설정

#### 2.1 Meta Business 계정 설정
1. [Meta for Developers](https://developers.facebook.com) 가입
2. 새 앱 생성 (Type: Business)
3. WhatsApp 제품 추가

#### 2.2 WhatsApp Business API 설정
```bash
1. WhatsApp → Getting Started
2. 전화번호 추가 및 인증
3. Access Token 생성
4. Phone Number ID 확인
```

#### 2.3 Webhook 설정
1. WhatsApp → Configuration → Webhooks
2. Callback URL: `https://your-domain.com/webhook/whatsapp`
3. Verify Token 설정
4. 구독 필드 선택: messages, message_status

### 3. Twilio 설정 (대안)

#### 3.1 Twilio 계정 생성
1. [Twilio Console](https://www.twilio.com/console) 가입
2. WhatsApp Sandbox 활성화
3. Sandbox 전화번호 확인

#### 3.2 인증 정보 가져오기
```bash
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxx
WhatsApp Number: +14155238886 (Sandbox)
```

## 🚀 애플리케이션 설치

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/gdrive-whatsapp-notifier.git
cd gdrive-whatsapp-notifier
```

### 2. Python 환경 설정
```bash
# Python 3.10 이상 필요
python --version

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 3. 환경 변수 설정
```bash
# .env 파일 생성
cp config/.env.example config/.env

# .env 파일 편집
nano config/.env
```

필수 환경 변수:
```env
# Google API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# WhatsApp (Meta 또는 Twilio 중 선택)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# 서버
API_KEY=generate_secure_key_here
WEBHOOK_URL=https://your-domain.com/webhook
```

### 4. 데이터베이스 초기화
```bash
# SQLite 사용 시 (기본)
python -c "from src.database import init_db; init_db()"

# PostgreSQL 사용 시
# DATABASE_URL=postgresql://user:pass@localhost/gdrive_whatsapp
```

## 📝 Google Apps Script 설정

### 1. Apps Script 프로젝트 생성
1. [Google Apps Script](https://script.google.com) 접속
2. 새 프로젝트 생성
3. 프로젝트명 설정: "GDrive WhatsApp Notifier"

### 2. 스크립트 복사
```javascript
// scripts/google_apps_script.gs 내용 복사
// Apps Script 에디터에 붙여넣기
```

### 3. 설정값 수정
```javascript
const CONFIG = {
  WEBHOOK_URL: 'https://your-domain.com/webhook/gdrive',
  API_KEY: 'your-api-key-here',
  NOTIFICATION_EMAIL: 'your-email@example.com'
};
```

### 4. 트리거 설치
```javascript
// Apps Script 에디터에서 실행:
1. 함수 선택: onInstall
2. Run 버튼 클릭
3. 권한 승인
```

### 5. 테스트
```javascript
// testWebhook 함수 실행
1. 함수 선택: testWebhook
2. Run 버튼 클릭
3. 로그 확인 (View → Logs)
```

## 🌐 서버 배포

### 개발 서버 실행
```bash
# 로컬 실행
python src/main.py

# 또는 uvicorn 직접 실행
uvicorn src.main:app --reload --port 8000
```

### Ngrok으로 로컬 테스트
```bash
# Ngrok 설치
# https://ngrok.com/download

# 터널 생성
ngrok http 8000

# HTTPS URL을 웹훅 URL로 사용
# https://xxxxx.ngrok.io/webhook/gdrive
```

### 프로덕션 배포 (Docker)
```bash
# Docker 이미지 빌드
docker build -t gdrive-whatsapp-notifier .

# 컨테이너 실행
docker run -d \
  --name gdrive-whatsapp \
  -p 8000:8000 \
  --env-file config/.env \
  gdrive-whatsapp-notifier
```

### 프로덕션 배포 (PM2)
```bash
# PM2 설치
npm install -g pm2

# PM2로 서버 시작
pm2 start "python src/main.py" --name gdrive-whatsapp

# 로그 확인
pm2 logs gdrive-whatsapp
```

## ✅ 설치 확인

### 1. API 헬스 체크
```bash
curl http://localhost:8000/
# 응답: {"status": "healthy", ...}
```

### 2. 테스트 알림 전송
```bash
curl -X POST http://localhost:8000/notify/manual \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["+821012345678"],
    "message": "테스트 메시지입니다"
  }'
```

### 3. Google Apps Script 테스트
1. Apps Script에서 `testWebhook()` 실행
2. 서버 로그 확인
3. WhatsApp 메시지 수신 확인

## 🔧 문제 해결

### Google API 인증 실패
```bash
# 새 토큰 생성
python scripts/get_google_token.py

# credentials.json 위치 확인
ls config/credentials.json
```

### WhatsApp 메시지 전송 실패
```bash
# API 키 확인
echo $WHATSAPP_ACCESS_TOKEN

# 전화번호 형식 확인 (국가코드 포함)
# 올바른 형식: +821012345678
```

### 웹훅 수신 안 됨
```bash
# 방화벽 확인
sudo ufw allow 8000

# Ngrok 터널 확인
ngrok http 8000
```

## 📞 추가 설정

### 수신자 관리
```python
# config/recipients.yaml
groups:
  admin:
    - "+821012345678"
    - "+821087654321"
  team:
    - "+821011112222"
    - "+821033334444"

rules:
  - file_pattern: "*.pdf"
    notify: ["admin"]
  - folder: "Projects/*"
    notify: ["team"]
```

### 알림 스케줄링
```yaml
# config/schedule.yaml
quiet_hours:
  start: "22:00"
  end: "08:00"
  timezone: "Asia/Seoul"

rate_limits:
  max_per_minute: 10
  max_per_hour: 100
```

## 🎉 설치 완료!

모든 설정이 완료되면:
1. Google Drive에서 파일 공유
2. WhatsApp 알림 수신 확인
3. 대시보드에서 로그 확인: http://localhost:8000/docs

문제가 있다면 [GitHub Issues](https://github.com/yourusername/gdrive-whatsapp-notifier/issues)에 문의하세요.