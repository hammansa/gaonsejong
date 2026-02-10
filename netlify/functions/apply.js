// 제보/문의 폼을 받아 관리자 이메일로 전달하는 Netlify Function
//
// 환경 변수(넷lify 대시보드에서 설정 필요)
// - SENDGRID_API_KEY : SendGrid API Key
// - ADMIN_EMAIL      : 제보가 도착할 관리자 이메일 주소
// - FROM_EMAIL       : 발신자로 사용할 이메일 주소(없으면 ADMIN_EMAIL 사용)
//
// 프런트엔드 폼은 다음 엔드포인트로 POST 합니다.
// - action="/.netlify/functions/apply" method="POST"
//
const querystring = require('querystring');
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || ADMIN_EMAIL;

if (SENDGRID_API_KEY && ADMIN_EMAIL) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function response(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(bodyObj),
  };
}

function parseBody(event) {
  const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(event.body || '{}');
    } catch {
      return {};
    }
  }
  // form-encoded (기본 HTML form)
  return querystring.parse(event.body || '');
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    // CORS preflight
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method Not Allowed' });
  }

  if (!SENDGRID_API_KEY || !ADMIN_EMAIL) {
    return response(500, { error: 'Email service is not configured (missing SENDGRID_API_KEY or ADMIN_EMAIL).' });
  }

  const data = parseBody(event);

  const name = (data.name || '').toString().trim();
  const email = (data.email || '').toString().trim();
  const phone = (data.phone || '').toString().trim();
  const category = (data.category || '').toString().trim() || '일반 제보';
  const message = (data.message || '').toString().trim();

  if (!name || !message) {
    return response(400, { error: '이름과 내용을 입력해 주세요.' });
  }

  const now = new Date().toISOString();
  const ip =
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    event.multiValueHeaders?.['x-forwarded-for']?.[0] ||
    'unknown';
  const ua = event.headers['user-agent'] || '';

  const subject = `[노가다뉴스 제보] ${category} - ${name}`;

  const textLines = [
    `카테고리: ${category}`,
    `이름: ${name}`,
    `이메일: ${email || '(미입력)'}`,
    `전화번호: ${phone || '(미입력)'}`,
    '',
    '--- 제보/문의 내용 ---',
    message,
    '',
    '--- 메타 정보 ---',
    `시간(UTC): ${now}`,
    `IP: ${ip}`,
    `User-Agent: ${ua}`,
  ];

  const msg = {
    to: ADMIN_EMAIL,
    from: FROM_EMAIL,
    subject,
    text: textLines.join('\n'),
  };

  try {
    await sgMail.send(msg);
    return response(200, { ok: true, message: '접수가 완료되었습니다.' });
  } catch (err) {
    console.error('apply function email send error:', err);
    return response(500, { error: '제보를 처리하는 중 오류가 발생했습니다.' });
  }
};
