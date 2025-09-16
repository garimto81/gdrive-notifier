# 📱 구글 드라이브 → WhatsApp 심플 알림

**가장 간단한 방법**으로 구글 드라이브 파일 공유 알림을 WhatsApp으로 받기

## 🎯 기능 (딱 필요한 것만)

- ✅ 구글 드라이브에 파일 공유되면
- ✅ WhatsApp으로 알림 전송
- ✅ 끝!

## 🚀 10분 설치 가이드

### 1단계: Make.com 설정 (무료)

1. [Make.com](https://www.make.com) 가입 (무료)
2. 새 시나리오 생성
3. **Webhook** 모듈 추가 → **WhatsApp** 모듈 연결
4. Webhook URL 복사

> 📖 **자세한 설정 가이드**: [MAKE_SETUP_GUIDE.md](MAKE_SETUP_GUIDE.md) 참조

### 2단계: Google Apps Script 설정

1. [Google Apps Script](https://script.google.com) 접속
2. 새 프로젝트 생성
3. `google-script.gs` 내용 복사 → 붙여넣기
4. 코드 상단의 설정 수정:
   ```javascript
   const WEBHOOK_URL = '여기에-Make.com-webhook-URL';
   const WHATSAPP_NUMBER = '+821012345678';
   ```
5. `setup()` 함수 실행 (한 번만)

### 3단계: 테스트

1. `testNotification()` 함수 실행
2. WhatsApp 메시지 확인

## 📝 파일 구성

- `index.html` - 설정 페이지 (선택사항)
- `google-script.gs` - Google Apps Script 코드
- `README.md` - 이 파일

## 💡 사용법

설정 후에는 **아무것도 할 필요 없습니다!**

- 누군가 파일을 공유하면
- 5분 이내에 WhatsApp 알림이 옵니다

## 🔧 Make.com 설정 상세

### Webhook 설정
1. Webhooks → Custom webhook
2. Data structure 생성:
   - phone (text)
   - message (text)
   - fileName (text)
   - fileUrl (text)

### WhatsApp 설정
1. WhatsApp Business → Send a Message
2. Connection: WhatsApp Business 계정 연결
3. To: `{{phone}}`
4. Message: `{{message}}`

## 🆓 완전 무료

- Make.com: 월 1,000 operations 무료
- Google Apps Script: 무료
- WhatsApp Business: 무료

## ❓ 자주 묻는 질문

**Q: WhatsApp Business 계정이 필요한가요?**
A: 네, Meta for Developers에서 무료로 만들 수 있습니다.

**Q: 얼마나 자주 체크하나요?**
A: 5분마다 자동 체크합니다.

**Q: 여러 번호로 보낼 수 있나요?**
A: 코드에서 WHATSAPP_NUMBER를 배열로 수정하면 됩니다.

## 🚨 문제 해결

1. **알림이 안 와요**
   - Google Apps Script 로그 확인
   - Make.com 시나리오 실행 확인

2. **테스트는 되는데 실제 알림이 안 와요**
   - 트리거가 설정되었는지 확인
   - 권한이 승인되었는지 확인

## 📧 지원

문제가 있으면 Issues에 남겨주세요!

---

**이게 전부입니다. 복잡한 설정 없이 바로 사용하세요!** 🎉