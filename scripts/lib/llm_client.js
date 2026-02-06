const { gensparkGenerateText } = require('./genspark_text');

function validateArticle(obj){
  if(typeof obj !== 'object' || obj === null) throw new Error('article is not an object');
  const required = ['id','category','status','title','excerpt','date','readTime','bodyHtml','sources','official_docs','youtube_links','tags'];
  const missing = required.filter(k => !(k in obj));
  if(missing.length) throw new Error('missing required fields: ' + missing.join(', '));

  if(!Array.isArray(obj.sources)) throw new Error('sources must be an array');
  if(!Array.isArray(obj.official_docs)) obj.official_docs = [];
  if(!Array.isArray(obj.youtube_links)) obj.youtube_links = [];
  if(!Array.isArray(obj.tags)) obj.tags = [];

  const date = (''+obj.date).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
  } else if(/^\d{4}-\d{2}$/.test(date)){
    obj.date = date + '-01';
  } else if(/^\d{4}$/.test(date)){
    obj.date = date + '-01-01';
  } else {
    const d = new Date(date);
    if(!isNaN(d)){
      obj.date = d.toISOString().slice(0,10);
    } else {
      throw new Error('date field not in a recognized format: ' + obj.date);
    }
  }

  if(!Array.isArray(obj.sources)) obj.sources = [];
  obj.sources = obj.sources.slice(0, 3);
  for(const s of obj.sources){
    if(typeof s !== 'object' || !s.url) throw new Error('each source must be an object with at least url');
    if(!s.name) s.name = '';
    if(!s.type) s.type = '';
  }

  if(!obj.readTime) obj.readTime = '1분';
  if(!obj.bodyHtml) obj.bodyHtml = '<p></p>';

  try{
    const stripped = (''+obj.bodyHtml).replace(/<[^>]+>/g, ' ');
    const trimmed = stripped.trim().replace(/\s+/g, ' ');
    const limit = parseInt(process.env.BODY_CHAR_LIMIT || '800', 10);
    if(trimmed.length > limit){
      const short = trimmed.slice(0, limit).trim();
      obj.bodyHtml = `<h2>요약</h2><p>${short}…</p>`;
    }
  }catch(e){ }

  return obj;
}

async function generateArticle(ctx){
  const apiKey = process.env.GENSPARK_API_KEY;
  if(!apiKey){
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

  const prompt = (function buildPrompt(c){
    const now = new Date().toISOString().slice(0,10);
    const pieces = [];
    pieces.push('You are a news JSON generator. Produce exactly one JSON object, no extra text.');
    pieces.push('Required fields: id, category, status, title, excerpt, date (YYYY-MM-DD), readTime, bodyHtml, sources (array of {name,url,type}), official_docs (array), youtube_links (array), tags (array), notes.');
    pieces.push('Cost control: keep the article concise. Limit sources to at most 3 entries. Limit `bodyHtml` to a short summary (preferably <= 800 characters). Return only necessary HTML tags (h2/h3/p/ul/li).');
    pieces.push(`Context title: ${c.title || ''}`);
    if(c.excerpt) pieces.push(`Context excerpt: ${c.excerpt}`);
    if(c.url) pieces.push(`Source URL: ${c.url}`);
    if(c.sources && c.sources.length) pieces.push(`Known sources: ${JSON.stringify(c.sources)}`);
    pieces.push(`Prefer concise factual Korean language. Use HTML tags for bodyHtml (h2/h3/p/ul/li).`);
    pieces.push(`Set date to ${now} unless another date is provided.`);
    pieces.push('Return JSON only.');
    return pieces.join('\n');
  })(ctx);

  let output;
  try{
    output = await gensparkGenerateText({ prompt, system: 'You are a reporter for a Korean labor/construction news site.', maxTokens: parseInt(process.env.GENSPARK_MAX_TOKENS||'512',10) });
  }catch(e){
    throw new Error('Genspark call failed: ' + e.message);
  }

  let text = (typeof output === 'string') ? output.trim() : JSON.stringify(output);
  text = text.replace(/```json\s*/i, '').replace(/\s*```$/i, '');

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if(firstBrace >=0 && lastBrace > firstBrace){
    const candidate = text.slice(firstBrace, lastBrace+1);
    try{
      const parsed = JSON.parse(candidate);
      const validated = validateArticle(parsed);
      return JSON.stringify(validated);
    }catch(e){
      throw new Error('Generated JSON invalid or failed validation: ' + e.message + '\nRaw: ' + candidate);
    }
  }

  throw new Error('No JSON object found in Genspark output: ' + text.slice(0,200));
}

module.exports = { generateArticle };
