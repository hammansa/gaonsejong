// Simple Netlify Function placeholder for labor posts API
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const method = event.httpMethod;
  const dataPath = path.join(__dirname, '..', '..', 'data', 'labor_posts.json');
  if (method === 'GET') {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      return { statusCode: 200, body: raw };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({error: err.message}) };
    }
  }

  // POST would create a new post (requires authentication & validation)
  if (method === 'POST') {
    return { statusCode: 501, body: JSON.stringify({error: 'Creation not implemented in this template'}) };
  }

  return { statusCode: 405, body: JSON.stringify({error: 'Method not allowed'}) };
};
