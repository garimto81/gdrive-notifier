/**
 * 간단한 Google Drive → WhatsApp 알림
 *
 * 설치 방법:
 * 1. Google Apps Script에서 새 프로젝트 생성
 * 2. 이 코드 전체를 복사하여 붙여넣기
 * 3. WEBHOOK_URL과 WHATSAPP_NUMBER 설정
 * 4. setup() 함수 실행
 */

// ===== 설정 (이 부분만 수정하세요) =====
const WEBHOOK_URL = 'https://hook.us1.make.com/your-webhook-url'; // Make.com 또는 Zapier webhook
const WHATSAPP_NUMBER = '+821012345678'; // WhatsApp 번호

// ===== 메인 코드 (수정하지 마세요) =====

/**
 * 초기 설정 - 이 함수를 한 번 실행하세요
 */
function setup() {
  // 기존 트리거 제거
  ScriptApp.getProjectTriggers().forEach(trigger =>
    ScriptApp.deleteTrigger(trigger)
  );

  // 5분마다 체크하는 트리거 설정
  ScriptApp.newTrigger('checkNewShares')
    .timeBased()
    .everyMinutes(5)
    .create();

  // 마지막 체크 시간 설정
  PropertiesService.getScriptProperties().setProperty(
    'lastCheck',
    new Date().toISOString()
  );

  console.log('✅ 설정 완료! 5분마다 새로운 공유 파일을 체크합니다.');
}

/**
 * 새로운 공유 파일 체크
 */
function checkNewShares() {
  try {
    const lastCheck = PropertiesService.getScriptProperties().getProperty('lastCheck');
    const lastCheckDate = new Date(lastCheck || new Date().toISOString());
    const now = new Date();

    // 공유된 파일 검색
    const files = DriveApp.searchFiles(
      `sharedWithMe and modifiedDate > '${lastCheckDate.toISOString()}'`
    );

    while (files.hasNext()) {
      const file = files.next();
      sendWhatsAppNotification(file);
    }

    // 마지막 체크 시간 업데이트
    PropertiesService.getScriptProperties().setProperty(
      'lastCheck',
      now.toISOString()
    );

  } catch (error) {
    console.error('에러:', error);
  }
}

/**
 * WhatsApp 알림 전송
 */
function sendWhatsAppNotification(file) {
  const message = `📁 새 파일이 공유되었습니다!

📄 파일명: ${file.getName()}
👤 공유자: ${file.getOwner().getEmail()}
📅 시간: ${new Date().toLocaleString('ko-KR')}
🔗 링크: ${file.getUrl()}`;

  const payload = {
    phone: WHATSAPP_NUMBER,
    message: message,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl()
  };

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });

    console.log('✅ 알림 전송 완료:', file.getName());
  } catch (error) {
    console.error('❌ 알림 전송 실패:', error);
  }
}

/**
 * 테스트 함수 - 수동으로 실행해보세요
 */
function testNotification() {
  const testMessage = `🧪 테스트 메시지

구글 드라이브 알림이 정상 작동합니다!
시간: ${new Date().toLocaleString('ko-KR')}`;

  const payload = {
    phone: WHATSAPP_NUMBER,
    message: testMessage,
    type: 'test'
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });

    console.log('테스트 성공:', response.getContentText());
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}