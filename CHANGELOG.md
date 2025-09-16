# Changelog

모든 주요 변경사항이 이 파일에 기록됩니다.

이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따릅니다.

## [1.0.1] - 2025-01-15

### 🔧 버그 수정

#### 수정됨
- ✅ Google OAuth 400 오류 해결
- ✅ 리다이렉트 URI 불일치 문제 수정
- ✅ Client ID 설정 오류 해결
- ✅ OAuth 스코프 권한 문제 수정

#### 추가됨
- 📄 OAuth 콜백 페이지 (`callback.html`)
- 📦 Google Auth 헬퍼 모듈 (`assets/google-auth.js`)
- 📚 상세한 OAuth 설정 가이드 (`docs/GOOGLE_OAUTH_SETUP.md`)

#### 개선됨
- 🔐 OAuth 인증 플로우 안정성 향상
- 📱 사용자 친화적인 인증 UI
- 🔍 에러 처리 및 디버깅 기능 강화

## [1.0.0] - 2025-01-15

### 🎉 첫 공식 릴리즈

#### 추가됨
- ✨ GitHub Pages 기반 대시보드 UI
- ⚡ Cloudflare Workers 서버리스 백엔드
- 📱 WhatsApp Business API 통합
- 🔔 Google Drive 실시간 모니터링
- 📊 실시간 통계 및 차트
- 🌐 완전 온라인 기반 아키텍처
- 🚀 GitHub Actions 자동 배포

#### 기능
- Google OAuth 2.0 인증
- WhatsApp 메시지 자동 전송
- 수신자 관리 시스템
- 알림 템플릿 커스터마이징
- 일일 리포트 자동 생성
- Rate limiting 및 보안 기능

#### 문서
- 상세한 설치 가이드
- API 문서
- 트러블슈팅 가이드

## [0.9.0] - 2025-01-15 (Beta)

### 베타 테스트 버전

#### 추가됨
- 초기 프로토타입 구현
- 기본 웹훅 처리
- 테스트 환경 구성

---

## 로드맵

### [1.1.0] - 예정
- 📱 모바일 반응형 개선
- 🌍 다국어 지원 (i18n)
- 📈 고급 분석 대시보드

### [1.2.0] - 예정
- 🔐 2단계 인증
- 📧 이메일 알림 옵션
- 🎨 다크 모드

### [2.0.0] - 예정
- 🤖 AI 기반 스마트 필터링
- 📲 Telegram, Slack 지원
- 🔄 양방향 동기화