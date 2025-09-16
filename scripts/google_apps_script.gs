/**
 * Google Apps Script - Google Drive to WhatsApp 알림 시스템
 *
 * 이 스크립트는 Google Drive의 파일 공유 이벤트를 감지하고
 * 웹훅을 통해 Python 서버로 알림을 전송합니다.
 */

// 설정값 - 실제 사용 시 변경 필요
const CONFIG = {
  WEBHOOK_URL: 'https://your-domain.com/webhook/gdrive', // Python 서버 웹훅 URL
  API_KEY: 'your-api-key-here', // 보안을 위한 API 키
  NOTIFICATION_EMAIL: 'admin@example.com', // 에러 알림용 이메일
  CHECK_INTERVAL_MINUTES: 5, // 체크 간격 (분)
  MAX_RETRIES: 3 // 웹훅 실패 시 재시도 횟수
};

/**
 * 초기 설정 - 트리거 설치
 */
function onInstall() {
  // 기존 트리거 제거
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // 새 트리거 설치 - 5분마다 실행
  ScriptApp.newTrigger('checkDriveChanges')
    .timeBased()
    .everyMinutes(CONFIG.CHECK_INTERVAL_MINUTES)
    .create();

  // 초기 상태 저장
  PropertiesService.getScriptProperties().setProperty('lastCheckTime', new Date().toISOString());

  Logger.log('트리거 설치 완료');
}

/**
 * Drive 변경사항 체크 - 메인 함수
 */
function checkDriveChanges() {
  try {
    const lastCheckTime = PropertiesService.getScriptProperties().getProperty('lastCheckTime');
    const currentTime = new Date();

    // 최근 공유된 파일들 검색
    const sharedFiles = findRecentlySharedFiles(lastCheckTime);

    if (sharedFiles.length > 0) {
      Logger.log(`발견된 새 공유: ${sharedFiles.length}개`);

      // 각 파일에 대해 웹훅 전송
      sharedFiles.forEach(file => {
        sendWebhookNotification(file);
      });
    }

    // 마지막 체크 시간 업데이트
    PropertiesService.getScriptProperties().setProperty('lastCheckTime', currentTime.toISOString());

  } catch (error) {
    Logger.log('에러 발생: ' + error.toString());
    sendErrorNotification(error);
  }
}

/**
 * 최근 공유된 파일 찾기
 */
function findRecentlySharedFiles(lastCheckTime) {
  const sharedFiles = [];
  const lastCheck = new Date(lastCheckTime);

  try {
    // 'sharedWithMe' 쿼리로 공유된 파일 검색
    const query = `sharedWithMe and modifiedDate > '${lastCheck.toISOString()}'`;
    const files = DriveApp.searchFiles(query);

    while (files.hasNext()) {
      const file = files.next();
      const fileData = getFileDetails(file);

      // 실제로 새로 공유된 파일인지 확인
      if (isNewlyShared(file, lastCheck)) {
        sharedFiles.push(fileData);
      }
    }

    // 내가 다른 사람과 공유한 파일도 체크
    const mySharedFiles = checkMySharedFiles(lastCheck);
    sharedFiles.push(...mySharedFiles);

  } catch (error) {
    Logger.log('파일 검색 중 에러: ' + error.toString());
  }

  return sharedFiles;
}

/**
 * 내가 공유한 파일 체크
 */
function checkMySharedFiles(lastCheck) {
  const sharedFiles = [];

  try {
    // 내 드라이브의 모든 파일 중 최근 수정된 것들
    const files = DriveApp.getFilesByType(null);

    while (files.hasNext()) {
      const file = files.next();

      // 최근에 수정되고 공유 설정이 있는 파일
      if (file.getLastUpdated() > lastCheck) {
        const editors = file.getEditors();
        const viewers = file.getViewers();

        if (editors.length > 0 || viewers.length > 0) {
          const fileData = getFileDetails(file);
          fileData.sharedBy = Session.getActiveUser().getEmail();
          fileData.eventType = 'file_shared_by_me';
          sharedFiles.push(fileData);
        }
      }
    }
  } catch (error) {
    Logger.log('내 공유 파일 체크 중 에러: ' + error.toString());
  }

  return sharedFiles;
}

/**
 * 파일이 새로 공유되었는지 확인
 */
function isNewlyShared(file, lastCheck) {
  try {
    // 파일의 공유 날짜를 확인
    const createdDate = file.getDateCreated();
    const sharingDate = file.getLastUpdated();

    // 공유 날짜가 마지막 체크 이후인지 확인
    return sharingDate > lastCheck;
  } catch (error) {
    return false;
  }
}

/**
 * 파일 상세 정보 가져오기
 */
function getFileDetails(file) {
  try {
    const fileData = {
      fileId: file.getId(),
      fileName: file.getName(),
      fileType: file.getMimeType(),
      fileSize: file.getSize(),
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      thumbnailUrl: getThumbnailUrl(file),
      owner: file.getOwner() ? file.getOwner().getEmail() : 'Unknown',
      lastModified: file.getLastUpdated().toISOString(),
      createdDate: file.getDateCreated().toISOString(),
      description: file.getDescription() || '',
      editors: file.getEditors().map(user => user.getEmail()),
      viewers: file.getViewers().map(user => user.getEmail()),
      sharingPermission: file.getSharingPermission().toString(),
      sharingAccess: file.getSharingAccess().toString(),
      eventType: 'file_shared',
      timestamp: new Date().toISOString()
    };

    // 폴더인 경우 추가 정보
    if (file.getMimeType() === 'application/vnd.google-apps.folder') {
      fileData.isFolder = true;
      fileData.eventType = 'folder_shared';
    }

    return fileData;
  } catch (error) {
    Logger.log('파일 정보 가져오기 실패: ' + error.toString());
    return {
      fileName: file.getName(),
      fileId: file.getId(),
      error: error.toString()
    };
  }
}

/**
 * 썸네일 URL 생성
 */
function getThumbnailUrl(file) {
  try {
    // Google Drive 썸네일 URL 패턴
    const fileId = file.getId();
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  } catch (error) {
    return null;
  }
}

/**
 * 웹훅으로 알림 전송
 */
function sendWebhookNotification(fileData) {
  const payload = {
    ...fileData,
    source: 'google_apps_script',
    apiKey: CONFIG.API_KEY
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
      'X-Source': 'Google-Apps-Script'
    }
  };

  let retries = 0;
  let success = false;

  while (retries < CONFIG.MAX_RETRIES && !success) {
    try {
      const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200 || responseCode === 201) {
        Logger.log('웹훅 전송 성공: ' + fileData.fileName);
        success = true;

        // 성공 로그 저장
        logWebhookResult(fileData, true, response.getContentText());
      } else {
        Logger.log(`웹훅 전송 실패 (${responseCode}): ` + response.getContentText());
        retries++;

        if (retries < CONFIG.MAX_RETRIES) {
          Utilities.sleep(1000 * retries); // 재시도 전 대기
        }
      }
    } catch (error) {
      Logger.log('웹훅 전송 에러: ' + error.toString());
      retries++;

      if (retries >= CONFIG.MAX_RETRIES) {
        // 최대 재시도 후 실패 로그
        logWebhookResult(fileData, false, error.toString());
        sendErrorNotification(error);
      }
    }
  }
}

/**
 * 웹훅 결과 로그 저장
 */
function logWebhookResult(fileData, success, response) {
  const sheet = getOrCreateLogSheet();

  sheet.appendRow([
    new Date().toISOString(),
    fileData.fileName,
    fileData.fileId,
    fileData.eventType,
    success ? 'SUCCESS' : 'FAILED',
    response
  ]);
}

/**
 * 로그 시트 가져오기 또는 생성
 */
function getOrCreateLogSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('logSpreadsheetId');

  let spreadsheet;
  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      spreadsheet = createLogSpreadsheet();
    }
  } else {
    spreadsheet = createLogSpreadsheet();
  }

  return spreadsheet.getSheetByName('Webhook Logs') || createLogSheet(spreadsheet);
}

/**
 * 로그 스프레드시트 생성
 */
function createLogSpreadsheet() {
  const spreadsheet = SpreadsheetApp.create('GDrive-WhatsApp 알림 로그');
  PropertiesService.getScriptProperties().setProperty('logSpreadsheetId', spreadsheet.getId());

  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('Webhook Logs');

  // 헤더 추가
  sheet.getRange(1, 1, 1, 6).setValues([
    ['Timestamp', 'File Name', 'File ID', 'Event Type', 'Status', 'Response']
  ]);

  // 헤더 스타일링
  sheet.getRange(1, 1, 1, 6)
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');

  return spreadsheet;
}

/**
 * 에러 알림 전송
 */
function sendErrorNotification(error) {
  const subject = 'GDrive-WhatsApp 알림 시스템 에러';
  const body = `
    에러가 발생했습니다:

    시간: ${new Date().toISOString()}
    에러: ${error.toString()}
    스택: ${error.stack || 'N/A'}

    확인이 필요합니다.
  `;

  try {
    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
  } catch (emailError) {
    Logger.log('이메일 전송 실패: ' + emailError.toString());
  }
}

/**
 * 수동 테스트 함수
 */
function testWebhook() {
  const testData = {
    fileId: 'test-file-id',
    fileName: '테스트 파일.pdf',
    fileType: 'application/pdf',
    fileUrl: 'https://drive.google.com/file/d/test-file-id',
    owner: Session.getActiveUser().getEmail(),
    eventType: 'test_event',
    timestamp: new Date().toISOString()
  };

  Logger.log('테스트 웹훅 전송 시작...');
  sendWebhookNotification(testData);
  Logger.log('테스트 완료');
}

/**
 * 설정 정보 확인
 */
function checkConfiguration() {
  const config = {
    webhookUrl: CONFIG.WEBHOOK_URL,
    checkInterval: CONFIG.CHECK_INTERVAL_MINUTES,
    lastCheckTime: PropertiesService.getScriptProperties().getProperty('lastCheckTime'),
    triggers: ScriptApp.getProjectTriggers().map(t => ({
      functionName: t.getHandlerFunction(),
      type: t.getEventType()
    })),
    userEmail: Session.getActiveUser().getEmail()
  };

  Logger.log('현재 설정:');
  Logger.log(JSON.stringify(config, null, 2));

  return config;
}

/**
 * 모든 트리거 제거 (리셋용)
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log(`${triggers.length}개의 트리거가 제거되었습니다.`);
}

/**
 * 통계 정보 가져오기
 */
function getStatistics() {
  const sheet = getOrCreateLogSheet();
  const data = sheet.getDataRange().getValues();

  const stats = {
    totalEvents: data.length - 1, // 헤더 제외
    successCount: 0,
    failedCount: 0,
    eventTypes: {},
    recentEvents: []
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[4];
    const eventType = row[3];

    if (status === 'SUCCESS') stats.successCount++;
    if (status === 'FAILED') stats.failedCount++;

    stats.eventTypes[eventType] = (stats.eventTypes[eventType] || 0) + 1;

    if (i >= data.length - 10) {
      stats.recentEvents.push({
        timestamp: row[0],
        fileName: row[1],
        status: row[4]
      });
    }
  }

  Logger.log('통계 정보:');
  Logger.log(JSON.stringify(stats, null, 2));

  return stats;
}