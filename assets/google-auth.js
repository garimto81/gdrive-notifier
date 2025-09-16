/**
 * Google OAuth 2.0 인증 헬퍼
 * GitHub Pages에서 사용할 수 있는 클라이언트 사이드 OAuth
 */

const GoogleAuth = {
    // OAuth 설정 (PUBLIC - 클라이언트 사이드용)
    config: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID', // 여기에 실제 Client ID 입력
        redirectUri: window.location.origin + '/callback.html',
        scope: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' '),
        authBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenInfoUrl: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
        driveApiUrl: 'https://www.googleapis.com/drive/v3'
    },

    /**
     * OAuth 인증 시작
     */
    signIn() {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'token',
            scope: this.config.scope,
            include_granted_scopes: 'true',
            state: 'gdrive-whatsapp-notifier',
            prompt: 'consent'
        });

        // OAuth 페이지로 리다이렉트
        window.location.href = `${this.config.authBaseUrl}?${params.toString()}`;
    },

    /**
     * 로그아웃
     */
    signOut() {
        // 저장된 토큰 삭제
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleAuthTime');
        localStorage.removeItem('googleUserEmail');
        localStorage.removeItem('googleUserName');

        // UI 업데이트
        this.updateAuthUI(false);

        // 토큰 무효화 (선택사항)
        const token = this.getAccessToken();
        if (token) {
            fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).catch(err => console.error('Token revocation failed:', err));
        }
    },

    /**
     * 현재 액세스 토큰 가져오기
     */
    getAccessToken() {
        return localStorage.getItem('googleAccessToken');
    },

    /**
     * 인증 상태 확인
     */
    async isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        // 토큰 만료 체크 (1시간)
        const authTime = localStorage.getItem('googleAuthTime');
        if (authTime) {
            const elapsed = Date.now() - new Date(authTime).getTime();
            const oneHour = 60 * 60 * 1000;
            if (elapsed > oneHour) {
                this.signOut();
                return false;
            }
        }

        // 토큰 유효성 검증
        try {
            const response = await fetch(`${this.config.tokenInfoUrl}?access_token=${token}`);
            return response.ok;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    },

    /**
     * 사용자 정보 가져오기
     */
    async getUserInfo() {
        const token = this.getAccessToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${this.config.userInfoUrl}?access_token=${token}`);
            if (!response.ok) throw new Error('Failed to fetch user info');
            return await response.json();
        } catch (error) {
            console.error('Get user info failed:', error);
            throw error;
        }
    },

    /**
     * Drive API 호출 헬퍼
     */
    async callDriveApi(endpoint, options = {}) {
        const token = this.getAccessToken();
        if (!token) throw new Error('Not authenticated');

        const url = `${this.config.driveApiUrl}/${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`Drive API error: ${response.status}`);
        }

        return await response.json();
    },

    /**
     * 최근 공유된 파일 가져오기
     */
    async getRecentSharedFiles(pageSize = 10) {
        try {
            const params = new URLSearchParams({
                q: "sharedWithMe = true",
                orderBy: "sharedWithMeTime desc",
                pageSize: pageSize,
                fields: "files(id,name,mimeType,webViewLink,iconLink,owners,sharingUser,sharedWithMeTime)"
            });

            return await this.callDriveApi(`files?${params.toString()}`);
        } catch (error) {
            console.error('Failed to fetch shared files:', error);
            throw error;
        }
    },

    /**
     * 파일 변경사항 모니터링 시작
     */
    async startChangeDetection() {
        try {
            // 초기 페이지 토큰 가져오기
            const response = await this.callDriveApi('changes/startPageToken');
            const startPageToken = response.startPageToken;

            // 로컬 스토리지에 저장
            localStorage.setItem('drivePageToken', startPageToken);

            return startPageToken;
        } catch (error) {
            console.error('Failed to start change detection:', error);
            throw error;
        }
    },

    /**
     * 파일 변경사항 확인
     */
    async checkForChanges() {
        try {
            const pageToken = localStorage.getItem('drivePageToken');
            if (!pageToken) {
                return await this.startChangeDetection();
            }

            const params = new URLSearchParams({
                pageToken: pageToken,
                fields: "newStartPageToken,changes(file(id,name,mimeType,webViewLink))"
            });

            const response = await this.callDriveApi(`changes?${params.toString()}`);

            // 새 페이지 토큰 저장
            if (response.newStartPageToken) {
                localStorage.setItem('drivePageToken', response.newStartPageToken);
            }

            return response.changes || [];
        } catch (error) {
            console.error('Failed to check for changes:', error);
            throw error;
        }
    },

    /**
     * UI 업데이트
     */
    updateAuthUI(isAuthenticated) {
        const googleStatus = document.getElementById('googleStatus');
        const connectButton = document.getElementById('connectGoogle');

        if (isAuthenticated) {
            const userEmail = localStorage.getItem('googleUserEmail') || 'Connected';
            if (googleStatus) {
                googleStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${userEmail}`;
                googleStatus.className = 'text-green-500';
            }
            if (connectButton) {
                connectButton.textContent = 'Google 계정 변경';
                connectButton.onclick = () => {
                    this.signOut();
                    this.signIn();
                };
            }
        } else {
            if (googleStatus) {
                googleStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> 연결 필요';
                googleStatus.className = 'text-yellow-500';
            }
            if (connectButton) {
                connectButton.innerHTML = '<i class="fab fa-google mr-2"></i>Google 계정 연결';
                connectButton.onclick = () => this.signIn();
            }
        }
    },

    /**
     * 초기화
     */
    async init() {
        // 인증 상태 확인
        const isAuth = await this.isAuthenticated();
        this.updateAuthUI(isAuth);

        // 인증된 경우 변경사항 모니터링 시작
        if (isAuth) {
            try {
                await this.startChangeDetection();
                console.log('Google Drive monitoring started');
            } catch (error) {
                console.error('Failed to start monitoring:', error);
            }
        }

        return isAuth;
    }
};

// 전역 객체로 노출 (HTML에서 사용)
window.GoogleAuth = GoogleAuth;