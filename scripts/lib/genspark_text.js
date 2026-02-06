const fetch = require('node-fetch');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Genspark Text Generation (template)
 * - Fill BASE_URL, ENDPOINT, headers, payload, parse logic after you receive API email.
 */
async function gensparkGenerateText({ prompt, system, maxTokens }) {
  const BASE_URL = process.env.GENSPARK_BASE_URL || '';
  const API_KEY = requireEnv('GENSPARK_API_KEY');
  const MODEL = process.env.GENSPARK_MODEL || '';
  const ENDPOINT = process.env.GENSPARK_TEXT_ENDPOINT || '/v1/generate';

  const url = (BASE_URL || '').replace(/\/$/, '') + ENDPOINT;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  const payload = {
    model: MODEL || undefined,
    system: system || undefined,
    prompt,
    max_tokens: maxTokens || 800,
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Genspark API error: ${res.status} ${res.statusText} :: ${t}`);
  }
  const data = await res.json();

  const text =
    data?.text ||
    data?.output?.text ||
    data?.choices?.[0]?.message?.content ||
    '';
  if (!text) throw new Error('Genspark response parsed empty text. Check response schema.');
  return text;
}

module.exports = { gensparkGenerateText };
