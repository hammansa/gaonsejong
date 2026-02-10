// 노동 게시판 읽기 전용 API
// - GET /.netlify/functions/labor
// - data/labor_posts.json 파일을 읽어 그대로 반환합니다.
//
const fs = require('fs');
const path = require('path');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(bodyObj),
  };
}

exports.handler = async function (event) {
  const method = event.httpMethod;
  const dataPath = path.join(__dirname, '..', '..', 'data', 'labor_posts.json');

  if (method === 'GET') {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      // 필요 시 status === 'published' 만 필터링 가능
      return jsonResponse(200, { items: parsed });
    } catch (err) {
      return jsonResponse(500, { error: err.message || 'Failed to read labor_posts.json' });
    }
  }

  // 읽기 전용: 생성/수정은 허용하지 않음
  return jsonResponse(405, { error: 'Method not allowed (read-only API)' });
};
