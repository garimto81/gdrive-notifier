/**
 * Cloudflare Worker - WhatsApp Webhook Handler
 * 서버리스 환경에서 Google Drive 웹훅을 받아 WhatsApp 알림을 전송합니다.
 */

// WhatsApp Business API 설정
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// CORS 헤더
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

/**
 * Cloudflare Worker 메인 핸들러
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * 요청 처리 함수
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 라우팅
    switch (path) {
      case '/':
        return handleRoot();

      case '/webhook':
        return await handleWebhook(request);

      case '/test':
        return await handleTest(request);

      case '/status':
        return await handleStatus();

      case '/logs':
        return await handleLogs();

      default:
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: CORS_HEADERS
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

/**
 * Root endpoint
 */
function handleRoot() {
  return new Response(JSON.stringify({
    service: 'GDrive-WhatsApp Webhook Handler',
    version: '1.0.0',
    status: 'healthy',
    endpoints: ['/webhook', '/test', '/status', '/logs']
  }), {
    headers: CORS_HEADERS
  });
}

/**
 * 웹훅 처리
 */
async function handleWebhook(request) {
  // API 키 검증
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: CORS_HEADERS
    });
  }

  // 요청 본문 파싱
  const payload = await request.json();

  // 이벤트 로깅
  await logEvent(payload);

  // 이벤트 타입별 처리
  const message = formatMessage(payload);
  const recipients = await getRecipients(payload);

  // WhatsApp 메시지 전송
  const results = await sendWhatsAppMessages(recipients, message, payload);

  return new Response(JSON.stringify({
    success: true,
    message: 'Notifications sent',
    results: results
  }), {
    headers: CORS_HEADERS
  });
}

/**
 * 메시지 포맷팅
 */
function formatMessage(payload) {
  const templates = {
    'file_shared': `🔔 *Google Drive 알림*\n\n📁 새 파일이 공유되었습니다!\n\n*파일명:* ${payload.fileName}\n*공유자:* ${payload.sharedBy || payload.owner}\n*시간:* ${new Date(payload.timestamp).toLocaleString('ko-KR')}\n\n🔗 ${payload.fileUrl || ''}`,

    'folder_shared': `🔔 *Google Drive 알림*\n\n📂 폴더가 공유되었습니다!\n\n*폴더명:* ${payload.fileName}\n*공유자:* ${payload.sharedBy || payload.owner}\n*시간:* ${new Date(payload.timestamp).toLocaleString('ko-KR')}\n\n🔗 ${payload.fileUrl || ''}`,

    'test_event': `🧪 *테스트 알림*\n\nWhatsApp 연동이 정상 작동합니다!\n\n시간: ${new Date().toLocaleString('ko-KR')}`
  };

  return templates[payload.eventType] || templates['file_shared'];
}

/**
 * 수신자 목록 가져오기
 */
async function getRecipients(payload) {
  // KV 스토리지에서 수신자 목록 조회
  const recipientsData = await GDRIVE_KV.get('recipients', { type: 'json' });

  if (!recipientsData) {
    // 기본 수신자 (환경 변수에서)
    return DEFAULT_RECIPIENTS ? DEFAULT_RECIPIENTS.split(',') : [];
  }

  // 규칙 기반 필터링
  const activeRecipients = recipientsData.filter(r => r.active);

  // 파일 타입이나 폴더별 필터링 로직 추가 가능
  if (payload.fileType && payload.fileType.includes('pdf')) {
    return activeRecipients.filter(r => r.tags?.includes('documents'));
  }

  return activeRecipients.map(r => r.phone);
}

/**
 * WhatsApp 메시지 전송
 */
async function sendWhatsAppMessages(recipients, message, payload) {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendSingleMessage(recipient, message, payload.thumbnailUrl);
      results.push({
        recipient: recipient,
        success: result.success,
        messageId: result.messageId
      });
    } catch (error) {
      results.push({
        recipient: recipient,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * 단일 WhatsApp 메시지 전송
 */
async function sendSingleMessage(phoneNumber, message, mediaUrl = null) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: normalizePhoneNumber(phoneNumber),
    type: mediaUrl ? 'image' : 'text'
  };

  if (mediaUrl) {
    body.image = {
      link: mediaUrl,
      caption: message
    };
  } else {
    body.text = { body: message };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (response.ok && result.messages) {
    return {
      success: true,
      messageId: result.messages[0].id
    };
  } else {
    throw new Error(result.error?.message || 'Failed to send message');
  }
}

/**
 * 전화번호 정규화
 */
function normalizePhoneNumber(phone) {
  // 특수문자 제거
  phone = phone.replace(/\D/g, '');

  // 한국 번호 처리
  if (phone.startsWith('010')) {
    phone = '82' + phone.substring(1);
  } else if (!phone.startsWith('82')) {
    // 국가 코드가 없으면 한국으로 가정
    if (phone.length === 10 || phone.length === 11) {
      phone = '82' + phone.replace(/^0/, '');
    }
  }

  return phone;
}

/**
 * 테스트 엔드포인트
 */
async function handleTest(request) {
  const testPayload = {
    eventType: 'test_event',
    fileName: 'test_file.pdf',
    timestamp: new Date().toISOString()
  };

  const message = formatMessage(testPayload);
  const testRecipient = TEST_PHONE_NUMBER || DEFAULT_RECIPIENTS.split(',')[0];

  try {
    const result = await sendSingleMessage(testRecipient, message);

    return new Response(JSON.stringify({
      success: true,
      message: 'Test notification sent',
      result: result
    }), {
      headers: CORS_HEADERS
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

/**
 * 상태 확인 엔드포인트
 */
async function handleStatus() {
  // WhatsApp API 상태 확인
  let whatsappStatus = 'unknown';
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
      }
    });
    whatsappStatus = response.ok ? 'connected' : 'error';
  } catch (error) {
    whatsappStatus = 'disconnected';
  }

  // KV 스토리지 상태
  let kvStatus = 'unknown';
  try {
    await GDRIVE_KV.get('test');
    kvStatus = 'connected';
  } catch (error) {
    kvStatus = 'error';
  }

  return new Response(JSON.stringify({
    service: 'operational',
    whatsapp: whatsappStatus,
    storage: kvStatus,
    timestamp: new Date().toISOString()
  }), {
    headers: CORS_HEADERS
  });
}

/**
 * 로그 조회 엔드포인트
 */
async function handleLogs() {
  try {
    const logs = await GDRIVE_KV.get('logs', { type: 'json' }) || [];

    // 최근 50개만 반환
    const recentLogs = logs.slice(-50).reverse();

    return new Response(JSON.stringify({
      success: true,
      count: recentLogs.length,
      logs: recentLogs
    }), {
      headers: CORS_HEADERS
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve logs'
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

/**
 * 이벤트 로깅
 */
async function logEvent(payload) {
  try {
    // 기존 로그 가져오기
    let logs = await GDRIVE_KV.get('logs', { type: 'json' }) || [];

    // 새 로그 추가
    logs.push({
      timestamp: new Date().toISOString(),
      eventType: payload.eventType,
      fileName: payload.fileName,
      fileId: payload.fileId,
      owner: payload.owner
    });

    // 최대 1000개 유지
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    // 저장
    await GDRIVE_KV.put('logs', JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

/**
 * Rate limiting 체크
 */
async function checkRateLimit(identifier) {
  const key = `rate_limit_${identifier}`;
  const current = await GDRIVE_KV.get(key);

  if (current) {
    const count = parseInt(current);
    if (count >= 100) { // 시간당 100개 제한
      return false;
    }
    await GDRIVE_KV.put(key, String(count + 1), { expirationTtl: 3600 });
  } else {
    await GDRIVE_KV.put(key, '1', { expirationTtl: 3600 });
  }

  return true;
}

// 예약된 작업 (Cron Triggers)
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

/**
 * 일일 리포트 생성 (Cron job)
 */
async function handleScheduled(event) {
  // 일일 통계 수집
  const logs = await GDRIVE_KV.get('logs', { type: 'json' }) || [];
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.timestamp.startsWith(today));

  const stats = {
    date: today,
    totalEvents: todayLogs.length,
    fileShares: todayLogs.filter(l => l.eventType === 'file_shared').length,
    folderShares: todayLogs.filter(l => l.eventType === 'folder_shared').length
  };

  // 통계 저장
  await GDRIVE_KV.put(`stats_${today}`, JSON.stringify(stats));

  // 관리자에게 일일 리포트 전송 (옵션)
  if (ADMIN_PHONE) {
    const message = `📊 *일일 리포트*\n\n날짜: ${today}\n총 이벤트: ${stats.totalEvents}\n파일 공유: ${stats.fileShares}\n폴더 공유: ${stats.folderShares}`;
    await sendSingleMessage(ADMIN_PHONE, message);
  }
}