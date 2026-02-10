const fetch = require('node-fetch');

// Use Google Generative Language REST endpoint to call a text model (e.g., text-bison-001)
// Requires environment variable GEMINI_API_KEY (API key) set in CI.

const MODEL = process.env.GEMINI_MODEL || 'text-bison-001';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta2/models';
const BASE_URL_V1 = 'https://generativelanguage.googleapis.com/v1/models';

function buildPrompt(ctx){
  // Minimal prompt template instructing LLM to return a single JSON object.
  const now = new Date().toISOString().slice(0,10);
  const pieces = [];
  pieces.push('You are a news JSON generator. Produce exactly one JSON object, no extra text.');
  pieces.push('Required fields: id, category, status, title, excerpt, date (YYYY-MM-DD), readTime, bodyHtml, sources (array of {name,url,type}), official_docs (array), youtube_links (array), tags (array), notes.');
  pieces.push('Cost control: keep the article concise. Limit sources to at most 3 entries. Limit `bodyHtml` to a short summary (preferably <= 800 characters). Return only necessary HTML tags (h2/h3/p/ul/li).');
  pieces.push(`Context title: ${ctx.title || ''}`);
  if(ctx.excerpt) pieces.push(`Context excerpt: ${ctx.excerpt}`);
  if(ctx.url) pieces.push(`Source URL: ${ctx.url}`);
  if(ctx.sources && ctx.sources.length) pieces.push(`Known sources: ${JSON.stringify(ctx.sources)}`);
  pieces.push(`Prefer concise factual Korean language. Use HTML tags for bodyHtml (h2/h3/p/ul/li).`);
  pieces.push(`Set date to ${now} unless another date is provided.`);
  pieces.push('Return JSON only.');
  return pieces.join('\n');
}

async function callGemini(prompt, apiKey){
  const body = {
    prompt: { text: prompt },
    // Use a conservative token budget to prefer fast/cheap models and concise output
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '512', 10)
  };

  // try primary endpoint first
  let url = `${BASE_URL}/${MODEL}:generateText?key=${encodeURIComponent(apiKey)}`;
  let resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // If the beta endpoint returns 404 (model/entity not found), retry v1 endpoint as fallback
  if(resp && resp.status === 404){
    try{
      console.warn('Gemini v1beta2 returned 404; retrying v1 endpoint');
      url = `${BASE_URL_V1}/${MODEL}:generateText?key=${encodeURIComponent(apiKey)}`;
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }catch(e){
      // fallthrough to error handling below
    }
  }

  if(!resp.ok){
    const txt = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${txt}`);
  }
  const j = await resp.json();
  // response.candidates[0].content is expected
  const cand = j.candidates && j.candidates[0];
  if(!cand) throw new Error('No candidate in Gemini response');
  return cand.output || cand.content || cand.text || cand;
}

async function generateArticle(ctx){
  const apiKey = process.env.GEMINI_API_KEY;
  if(!apiKey){
    // fallback to mock when no key
    const article = {
      id: ctx.id || `auto-${Date.now()}`,
      category: "임시",
      status: "임시",
      title: ctx.title || "[자동생성] 제목 없음",
      excerpt: ctx.excerpt || "요약 없음",
      date: new Date().toISOString().slice(0,10),
      readTime: "2분",
      bodyHtml: `<h2>요약</h2><p>자동 생성된 샘플 본문입니다.</p>`,
      sources: ctx.sources || [],
      official_docs: ctx.official_docs || [],
      youtube_links: ctx.youtube_links || [],
      tags: []
    };
    return JSON.stringify(article);
  }

  const prompt = buildPrompt(ctx);
  // call Gemini REST API
  let output;
  try{
    output = await callGemini(prompt, apiKey);
  }catch(e){
    throw new Error('Gemini call failed: ' + e.message);
  }

  // output may be string; try to extract JSON substring
  let text = (typeof output === 'string') ? output.trim() : JSON.stringify(output);
  // if wrapped in ```json blocks, strip
  text = text.replace(/```json\s*/i, '').replace(/\s*```$/i, '');

  // try to find first { ... } block
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if(firstBrace >=0 && lastBrace > firstBrace){
    const candidate = text.slice(firstBrace, lastBrace+1);
    try{
      const parsed = JSON.parse(candidate);
      const validated = validateArticle(parsed);
      return JSON.stringify(validated);
    }catch(e){
      // fallthrough to try final raw text
      throw new Error('Generated JSON invalid or failed validation: ' + e.message + '\nRaw: ' + candidate);
    }
  }

  // final attempt: return raw text (caller should handle parse failure)
  throw new Error('No JSON object found in Gemini output: ' + text.slice(0,200));
}

function validateArticle(obj){
  if(typeof obj !== 'object' || obj === null) throw new Error('article is not an object');
  const required = ['id','category','status','title','excerpt','date','readTime','bodyHtml','sources','official_docs','youtube_links','tags'];
  const missing = required.filter(k => !(k in obj));
  if(missing.length) throw new Error('missing required fields: ' + missing.join(', '));

  // types
  if(!Array.isArray(obj.sources)) throw new Error('sources must be an array');
  if(!Array.isArray(obj.official_docs)) obj.official_docs = [];
  if(!Array.isArray(obj.youtube_links)) obj.youtube_links = [];
  if(!Array.isArray(obj.tags)) obj.tags = [];

  // normalize date: allow YYYY-MM or YYYY or YYYY-MM-DD
  const date = (''+obj.date).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
    // ok
  } else if(/^\d{4}-\d{2}$/.test(date)){
    obj.date = date + '-01';
  } else if(/^\d{4}$/.test(date)){
    obj.date = date + '-01-01';
  } else {
    // try to parse ISO
    const d = new Date(date);
    if(!isNaN(d)){
      obj.date = d.toISOString().slice(0,10);
    } else {
      throw new Error('date field not in a recognized format: ' + obj.date);
    }
  }

  // ensure sources entries have name/url/type
  // enforce maximum number of sources to control downstream size/cost
  if(!Array.isArray(obj.sources)) obj.sources = [];
  obj.sources = obj.sources.slice(0, 3);
  for(const s of obj.sources){
    if(typeof s !== 'object' || !s.url) throw new Error('each source must be an object with at least url');
    if(!s.name) s.name = '';
    if(!s.type) s.type = '';
  }

  // simple defaults
  if(!obj.readTime) obj.readTime = '1분';
  if(!obj.bodyHtml) obj.bodyHtml = '<p></p>';

  // Truncate bodyHtml to a safe length: extract text, truncate, and rewrap to avoid huge HTML blobs
  try{
    const stripped = (''+obj.bodyHtml).replace(/<[^>]+>/g, ' ');
    const trimmed = stripped.trim().replace(/\s+/g, ' ');
    const limit = parseInt(process.env.BODY_CHAR_LIMIT || '800', 10);
    if(trimmed.length > limit){
      const short = trimmed.slice(0, limit).trim();
      obj.bodyHtml = `<h2>요약</h2><p>${short}…</p>`;
    }
  }catch(e){
    // ignore truncation errors
  }

  return obj;
}

module.exports = { generateArticle };
