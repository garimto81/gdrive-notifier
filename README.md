# 🌐 Google Drive to WhatsApp Notifier

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/garimto81/gdrive-notifier/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://garimto81.github.io/gdrive-notifier)

구글 드라이브 파일 공유 시 WhatsApp으로 자동 알림을 전송하는 **100% 서버리스** 시스템입니다.

## ✨ 특징

- 🚀 **완전 무료** - 모든 서비스 무료 티어 사용
- 🌍 **서버 불필요** - GitHub Pages + Cloudflare Workers
- 📱 **실시간 알림** - WhatsApp Business API 연동
- 🎨 **웹 대시보드** - 모든 설정을 브라우저에서
- 🔐 **안전한 인증** - OAuth 2.0 & API Key
- 📊 **실시간 모니터링** - 통계 및 로그 확인

## 🚀 빠른 시작

### 1. Repository Fork
```bash
1. 이 저장소를 Fork
2. Settings → Pages → Deploy from main branch
3. https://yourusername.github.io/gdrive-notifier 접속
```

### 2. Cloudflare Worker 설정
```bash
1. Cloudflare 계정 생성 (무료)
2. workers/ 폴더의 webhook.js 배포
3. Worker URL을 대시보드에 입력
```

### 3. WhatsApp 연동
```bash
1. Meta for Developers 가입
2. WhatsApp Business API 활성화
3. Access Token을 대시보드에 입력
```

### 4. Google Drive 연동
```bash
1. Google Apps Script 열기
2. scripts/google_apps_script.gs 복사
3. 웹훅 URL 설정 및 트리거 활성화
```

## 📂 프로젝트 구조

```
gdrive-notifier/
├── 📄 index.html              # 메인 대시보드
├── 📂 .github/workflows/      # GitHub Actions
├── 📂 workers/                # Cloudflare Workers
├── 📂 scripts/                # Google Apps Script
└── 📂 docs/                   # 문서
```

## 🛠️ 기술 스택

- **Frontend**: HTML, Tailwind CSS, Vanilla JS
- **Backend**: Cloudflare Workers (서버리스)
- **Storage**: Cloudflare KV
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions
- **APIs**: Google Drive API, WhatsApp Business API

## 📊 대시보드 기능

- ✅ 실시간 공유 파일 모니터링
- ✅ WhatsApp 수신자 관리
- ✅ 알림 히스토리 및 통계
- ✅ 테스트 알림 전송
- ✅ 일주일 통계 차트

## 💰 비용

**완전 무료!** 🎉

| 서비스 | 무료 한도 | 우리 사용량 |
|--------|----------|------------|
| GitHub Pages | 월 100GB | ~1GB |
| Cloudflare Workers | 일 100,000 요청 | ~1,000 |
| Google Apps Script | 일 6시간 실행 | ~30분 |
| WhatsApp API | 일 1,000 메시지 | ~100 |

## 📖 문서

- [설치 가이드](docs/SETUP_GUIDE.md)
- [API 문서](docs/API.md)
- [문제 해결](docs/TROUBLESHOOTING.md)

## 🤝 기여

기여를 환영합니다! Pull Request를 보내주세요.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

MIT License - 자유롭게 사용하세요!

## 🙏 감사의 말

- Google Drive API
- WhatsApp Business API
- Cloudflare Workers
- GitHub Pages

## 📞 문의

- 이슈: [GitHub Issues](https://github.com/garimto81/gdrive-notifier/issues)
- 이메일: garimto81@gmail.com

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!