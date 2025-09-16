# 📋 Google OAuth 400 오류 해결 가이드

## 🔴 오류 원인

"400. 오류가 발생했습니다" 는 다음과 같은 이유로 발생합니다:

1. **Client ID가 설정되지 않음**
2. **리다이렉트 URI가 등록되지 않음**
3. **잘못된 OAuth 스코프**
4. **JavaScript 출처가 승인되지 않음**

## ✅ 해결 방법 (단계별)

### 1단계: Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성:
   - "새 프로젝트" 클릭
   - 프로젝트 이름: `gdrive-whatsapp-notifier`
   - 만들기

### 2단계: Google Drive API 활성화

```
1. APIs & Services → Library
2. "Google Drive API" 검색
3. "사용" 버튼 클릭
4. "Google People API"도 동일하게 활성화 (사용자 정보용)
```

### 3단계: OAuth 2.0 클라이언트 ID 생성

#### A. OAuth 동의 화면 구성
```
1. APIs & Services → OAuth 동의 화면
2. User Type: "외부" 선택
3. 앱 정보 입력:
   - 앱 이름: GDrive WhatsApp Notifier
   - 사용자 지원 이메일: your-email@gmail.com
   - 개발자 연락처: your-email@gmail.com
4. 스코프 추가:
   - ../auth/drive.readonly
   - ../auth/userinfo.email
   - ../auth/userinfo.profile
5. 테스트 사용자 추가 (선택사항)
6. 저장
```

#### B. 클라이언트 ID 생성
```
1. APIs & Services → 사용자 인증 정보
2. "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
3. 애플리케이션 유형: "웹 애플리케이션"
4. 이름: "GitHub Pages Client"
5. 승인된 JavaScript 원본 추가:
   - http://localhost:8000
   - http://127.0.0.1:8000
   - https://garimto81.github.io
   - https://yourusername.github.io (본인 것으로 변경)
6. 승인된 리다이렉트 URI 추가:
   - http://localhost:8000/callback.html
   - http://127.0.0.1:8000/callback.html
   - https://garimto81.github.io/gdrive-notifier/callback.html
   - https://yourusername.github.io/gdrive-notifier/callback.html
7. "만들기" 클릭
```

### 4단계: Client ID 복사 및 설정

생성된 OAuth 2.0 클라이언트에서:
- **클라이언트 ID**: `1234567890-abcdefghijk.apps.googleusercontent.com`
- **클라이언트 보안 비밀번호**: (사용하지 않음 - 클라이언트 사이드)

### 5단계: 프로젝트 파일 수정

#### `assets/google-auth.js` 수정:
```javascript
config: {
    clientId: '여기에-실제-CLIENT-ID-붙여넣기', // ← 이 부분 수정!
    redirectUri: window.location.origin + '/gdrive-notifier/callback.html',
    // ... 나머지 설정
}
```

#### 로컬 테스트용 설정:
```javascript
// 개발 환경 감지
const isDevelopment = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

config: {
    clientId: 'YOUR_CLIENT_ID',
    redirectUri: isDevelopment
        ? 'http://localhost:8000/callback.html'
        : window.location.origin + '/gdrive-notifier/callback.html',
}
```

### 6단계: 로컬 테스트

```bash
# Python 간단한 서버로 테스트
cd gdrive-whatsapp-notifier
python -m http.server 8000

# 브라우저에서 접속
http://localhost:8000
```

### 7단계: GitHub Pages 배포

```bash
# 변경사항 커밋 및 푸시
git add .
git commit -m "fix: Google OAuth 설정 추가"
git push origin main
```

## 🔍 체크리스트

- [ ] Google Cloud 프로젝트 생성됨
- [ ] Google Drive API 활성화됨
- [ ] OAuth 동의 화면 구성 완료
- [ ] OAuth 2.0 클라이언트 ID 생성됨
- [ ] JavaScript 원본에 GitHub Pages URL 추가됨
- [ ] 리다이렉트 URI에 callback.html 경로 추가됨
- [ ] google-auth.js에 Client ID 입력됨
- [ ] 로컬에서 테스트 성공
- [ ] GitHub Pages에 배포됨

## 🚨 주의사항

### 1. URL 형식 정확히 맞추기
- ❌ 잘못된 예: `https://username.github.io/`
- ✅ 올바른 예: `https://username.github.io`

### 2. 경로 주의
- GitHub Pages 프로젝트 경로: `/gdrive-notifier/`
- 전체 콜백 URL: `https://username.github.io/gdrive-notifier/callback.html`

### 3. HTTPS 필수
- GitHub Pages는 HTTPS 사용
- 로컬 테스트는 HTTP 가능

### 4. Client Secret 노출 금지
- 클라이언트 사이드 OAuth는 Client ID만 사용
- Client Secret은 절대 코드에 포함하지 않음

## 💡 추가 팁

### 디버깅
```javascript
// 콘솔에서 OAuth URL 확인
console.log(GoogleAuth.config);

// 수동으로 OAuth URL 생성 테스트
const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=YOUR_CLIENT_ID&` +
    `redirect_uri=${encodeURIComponent(window.location.origin + '/gdrive-notifier/callback.html')}&` +
    `response_type=token&` +
    `scope=https://www.googleapis.com/auth/drive.readonly`;
console.log(testUrl);
```

### 에러 메시지별 해결책

| 에러 | 원인 | 해결 |
|------|------|------|
| redirect_uri_mismatch | 리다이렉트 URI 불일치 | Console에서 정확한 URI 추가 |
| invalid_client | Client ID 오류 | Client ID 확인 및 재입력 |
| access_denied | 권한 거부 | OAuth 동의 화면 재구성 |
| invalid_scope | 스코프 오류 | 필요한 API 활성화 확인 |

## 📞 추가 도움

문제가 계속되면:
1. [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
2. [GitHub Issues](https://github.com/garimto81/gdrive-notifier/issues)
3. 브라우저 개발자 도구 Console 에러 확인