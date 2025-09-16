# 📚 Make.com 상세 설정 가이드

## 🎯 Make.com이란?
노코드 자동화 플랫폼으로, 서버 없이 웹훅과 API를 연결할 수 있습니다.

## 📝 단계별 설정 가이드

### 1단계: Make.com 가입

1. **웹사이트 접속**
   - https://www.make.com 접속
   - "Get started free" 클릭

2. **계정 생성**
   - 이메일로 가입 또는 Google 계정 연동
   - 무료 플랜 선택 (월 1,000 operations)

### 2단계: 새 시나리오 생성

1. **대시보드에서**
   ```
   + Create a new scenario 클릭
   ```

2. **시나리오 이름 설정**
   ```
   이름: "Google Drive to WhatsApp"
   ```

### 3단계: Webhook 모듈 추가

1. **모듈 검색**
   ```
   중앙의 + 버튼 클릭
   → "Webhooks" 검색
   → "Webhooks" 선택
   ```

2. **Webhook 타입 선택**
   ```
   Custom webhook 선택
   ```

3. **Webhook 생성**
   ```
   Add 클릭
   → Webhook name: "Google Drive Notification"
   → Save 클릭
   ```

4. **Webhook URL 복사** ⭐ 중요!
   ```
   생성된 URL 예시:
   https://hook.us1.make.com/abcdefghijklmnop

   이 URL을 복사해서 보관하세요!
   ```

5. **데이터 구조 정의**
   ```
   Generate Data Structure 클릭
   → 아래 JSON 샘플 입력:
   ```
   ```json
   {
     "phone": "+821012345678",
     "message": "파일이 공유되었습니다",
     "fileName": "example.pdf",
     "fileUrl": "https://drive.google.com/file/...",
     "fileId": "abc123",
     "type": "file_shared"
   }
   ```
   ```
   Save 클릭
   ```

### 4단계: WhatsApp 모듈 추가

#### 옵션 A: WhatsApp Business API (공식)

1. **모듈 추가**
   ```
   Webhook 모듈 옆 + 클릭
   → "WhatsApp Business" 검색
   → "WhatsApp Business Cloud API" 선택
   → "Send a Message" 선택
   ```

2. **연결 설정**
   ```
   Create a connection 클릭
   → Connection name: "My WhatsApp"
   → Access Token: Meta에서 발급받은 토큰 입력
   → Phone Number ID: WhatsApp Business 번호 ID
   → Save 클릭
   ```

3. **메시지 설정**
   ```
   To: {{phone}} (Webhook에서 받은 번호)
   Message Type: Text
   Text Body: {{message}} (Webhook에서 받은 메시지)
   ```

#### 옵션 B: Twilio (대안)

1. **Twilio 모듈 추가**
   ```
   + 클릭 → "Twilio" 검색
   → "Send a Message" 선택
   ```

2. **Twilio 연결**
   ```
   Account SID: Twilio 대시보드에서 복사
   Auth Token: Twilio 대시보드에서 복사
   From: Twilio WhatsApp 번호 (whatsapp:+14155238886)
   ```

3. **메시지 설정**
   ```
   To: whatsapp:{{phone}}
   Body: {{message}}
   ```

### 5단계: 시나리오 저장 및 활성화

1. **저장**
   ```
   좌하단 Save 버튼 클릭
   ```

2. **테스트**
   ```
   Run once 클릭
   → 다른 탭에서 Webhook URL로 테스트 데이터 전송
   ```

3. **활성화**
   ```
   ON/OFF 스위치를 ON으로 변경
   → Scheduling 설정: "Immediately as data arrives"
   ```

## 🧪 테스트 방법

### cURL로 테스트
```bash
curl -X POST https://hook.us1.make.com/your-webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+821012345678",
    "message": "테스트 메시지입니다",
    "fileName": "test.pdf",
    "type": "test"
  }'
```

### Postman으로 테스트
1. POST 메서드 선택
2. URL: 복사한 Webhook URL
3. Body → raw → JSON
4. 테스트 데이터 입력
5. Send 클릭

## 🔧 문제 해결

### "Webhook이 응답하지 않음"
- Make.com 시나리오가 ON 상태인지 확인
- Webhook URL이 정확한지 확인

### "WhatsApp 메시지가 안 옴"
1. WhatsApp Business API 확인
   - Access Token이 유효한지
   - Phone Number ID가 정확한지

2. 번호 형식 확인
   - 국제 형식: +821012345678
   - whatsapp: 접두사 필요 여부 확인

### "무료 한도 초과"
- Make.com 무료: 월 1,000 operations
- 초과 시: 다음 달까지 대기 또는 유료 플랜

## 💡 고급 설정

### 조건부 라우팅
```
Router 추가 → 조건 설정
예: type = "important" 일 때만 전송
```

### 다중 수신자
```
Iterator 모듈 사용
→ 여러 번호로 반복 전송
```

### 에러 처리
```
Error handler 추가
→ 실패 시 재시도 또는 로그 저장
```

## 📊 Make.com 대안

### 1. Zapier (더 쉽지만 비쌈)
- 장점: UI가 더 직관적
- 단점: 무료 한도 낮음 (월 100 tasks)

### 2. n8n (자체 호스팅)
- 장점: 무제한 사용
- 단점: 서버 필요

### 3. IFTTT (가장 간단)
- 장점: 매우 쉬움
- 단점: 기능 제한적

### 4. 직접 구현
- WhatsApp Business API 직접 호출
- 서버 필요 (Node.js, Python 등)

## ✅ 체크리스트

- [ ] Make.com 계정 생성 완료
- [ ] 시나리오 생성 완료
- [ ] Webhook URL 복사 완료
- [ ] WhatsApp 연결 완료
- [ ] 테스트 메시지 전송 성공
- [ ] 시나리오 활성화 완료

## 📞 도움말

- Make.com 문서: https://www.make.com/help
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- 커뮤니티 포럼: https://community.make.com

---

💡 **팁**: Make.com 무료 플랜으로도 일반적인 사용에는 충분합니다.
하루 30개 정도의 파일 공유 알림이면 월 1,000회 한도 내에서 충분히 사용 가능!