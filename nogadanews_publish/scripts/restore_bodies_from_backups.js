#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = fs.readdirSync(root);
// consider any news.json* backup variants (excluding the live news.json)
const backups = files.filter(f => f.startsWith('news.json') && f !== 'news.json');
const articleDir = path.join(root, 'article_pages');
if (!fs.existsSync(articleDir)) fs.mkdirSync(articleDir, { recursive: true });

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return null; }
}

const mainFile = path.join(root, 'news.json');
const mainJson = loadJson(mainFile);
let main = null;
let rootIsObject = false;
if (Array.isArray(mainJson)) {
  main = mainJson;
} else if (mainJson && Array.isArray(mainJson.articles)) {
  main = mainJson.articles;
  rootIsObject = true;
} else {
  console.error('news.json does not contain an articles array — aborting');
  process.exit(1);
}
const byId = new Map(main.map(a => [a && a.id, a]));

let restored = 0;
for (const bak of backups) {
  const fullPath = path.join(root, bak);
  const data = loadJson(fullPath);
  if (Array.isArray(data)) {
    for (const art of data) {
      if (!art || !art.id) continue;
      const id = art.id;
      if (!art.bodyHtml || typeof art.bodyHtml !== 'string' || art.bodyHtml.trim().length === 0) continue;
      const targetFile = path.join(articleDir, `${id}.html`);
      let shouldWrite = true;
      if (fs.existsSync(targetFile)) {
        try {
          const existing = fs.readFileSync(targetFile, 'utf8');
          if (existing.length >= (art.bodyHtml ? art.bodyHtml.length : 0)) shouldWrite = false;
        } catch(e) { /* ignore */ }
      }
      if (!shouldWrite) continue;
      try {
        fs.writeFileSync(targetFile, art.bodyHtml, 'utf8');
        if (byId.has(id)) {
          const m = byId.get(id);
          m.articleUrl = `/article_pages/${id}.html`;
          delete m.bodyHtml;
        }
        restored++;
        console.log('restored', id, '->', targetFile);
      } catch (e) {
        console.error('failed to write', targetFile, e && e.message);
      }
    }
    continue;
  }

  // fallback: try to extract bodyHtml blocks from raw text when JSON.parse failed
  try {
    const txt = fs.readFileSync(fullPath, 'utf8');
    let pos = 0;
    while (true) {
      const keyPos = txt.indexOf('"bodyHtml"', pos);
      if (keyPos === -1) break;
      // find id by searching backwards for "id": before this block
      const idKeyPos = txt.lastIndexOf('"id"', keyPos);
      let id = null;
      if (idKeyPos !== -1) {
        const idStart = txt.indexOf(':', idKeyPos) + 1;
        const idLineEnd = txt.indexOf('\n', idStart);
        if (idLineEnd !== -1) {
          const rawId = txt.substring(idStart, idLineEnd).trim();
          id = rawId.replace(/^\"|\"[,]?$/g, '').replace(/,$/, '').trim();
        }
      }
      // find the value start and a heuristic end (next '\n    },' or '\n  },')
      const colon = txt.indexOf(':', keyPos);
      let valStart = colon + 1;
      // trim leading spaces
      while (valStart < txt.length && /[ \t\r\n]/.test(txt[valStart])) valStart++;
      // if starts with a quote, capture until the next '\n    },' pattern
      const endMarker1 = '\n    },';
      const endMarker2 = '\n  },';
      let valEnd = txt.indexOf(endMarker1, valStart);
      if (valEnd === -1) valEnd = txt.indexOf(endMarker2, valStart);
      if (valEnd === -1) {
        pos = keyPos + 1; continue;
      }
      let raw = txt.substring(valStart, valEnd).trim();
      // remove surrounding commas/braces
      if (raw.endsWith(',')) raw = raw.slice(0, -1);
      // strip surrounding quotes if present
      if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
      // unescape common escapes
      raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r');
      if (!id) id = 'unknown-'+restored;
      const targetFile = path.join(articleDir, `${id}.html`);
      let shouldWriteFallback = true;
      if (fs.existsSync(targetFile)) {
        try { const existing = fs.readFileSync(targetFile,'utf8'); if (existing.length >= raw.length) shouldWriteFallback = false; } catch(e){}
      }
      if (shouldWriteFallback && raw && raw.trim().length>0) {
        try { fs.writeFileSync(targetFile, raw, 'utf8');
          if (byId.has(id)) { const m = byId.get(id); m.articleUrl = `/article_pages/${id}.html`; delete m.bodyHtml; }
          restored++; console.log('fallback restored', id, '->', targetFile);
        } catch(e){ console.error('fallback write failed', e && e.message); }
      }
      pos = valEnd + 1;
    }
  } catch (e) {
    // ignore
  }
}

if (restored > 0) {
  if (rootIsObject) {
    mainJson.articles = main;
    fs.writeFileSync(mainFile, JSON.stringify(mainJson, null, 2), 'utf8');
  } else {
    fs.writeFileSync(mainFile, JSON.stringify(main, null, 2), 'utf8');
  }
  console.log('Updated', mainFile, 'and wrote', restored, 'article pages.');
} else {
  console.log('No article bodies found in backups to restore.');
}

process.exit(0);
