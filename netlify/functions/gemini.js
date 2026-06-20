exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  const key = process.env.GEMINI_API_KEY;
  if (event.httpMethod === 'GET') return { statusCode: 200, headers, body: JSON.stringify({ ok: !!key }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };
  if (!key) return { statusCode: 200, headers, body: JSON.stringify({ error: 'NO_SERVER_KEY' }) };
  let req;
  try { req = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers, body: '{}' }; }
  const model = String(req.model || 'gemini-2.5-flash').replace(/[^a-zA-Z0-9.\-]/g, '');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}) });
    const text = await r.text();
    return { statusCode: r.status, headers, body: text };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: String(e) }) };
  }
};
