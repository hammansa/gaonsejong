#!/usr/bin/env node
// Validate and optionally fix news.json schema (ensure `bodyHtml` present)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const newsPath = path.join(ROOT, 'news.json');

function stripHtml(s){ return String(s||'').replace(/<[^>]+>/g, ''); }

function usage(){
  console.log('Usage: node validate_news_schema.js [--fix]');
  process.exit(1);
}

const args = process.argv.slice(2);
const doFix = args.indexOf('--fix') !== -1;

if(!fs.existsSync(newsPath)){
  console.error('news.json not found at', newsPath);
  process.exit(2);
}

let news;
try{ news = JSON.parse(fs.readFileSync(newsPath,'utf8')); }catch(e){ console.error('Failed to parse news.json:', e.message); process.exit(3);} 

const articles = Array.isArray(news.articles) ? news.articles : [];
let problems = 0;
for(let i=0;i<articles.length;i++){
  const a = articles[i];
  if(!a.id || !a.title){
    console.warn(`[WARN] article[${i}] missing id/title`);
    problems++;
  }
  if(!a.bodyHtml){
    if(a.content || a.body){
      console.log(`[FIX] article[${i}] adding bodyHtml from content/body`);
      a.bodyHtml = a.body || a.content || '';
    }else{
      console.warn(`[WARN] article[${i}] missing bodyHtml and no content/body fallback`);
      problems++;
    }
  }
  if(!a.excerpt && a.bodyHtml){
    a.excerpt = stripHtml(a.bodyHtml).trim().slice(0,220);
    console.log(`[INFO] article[${i}] generated excerpt (${a.excerpt.length} chars)`);
  }
}

if(doFix){
  try{
    fs.writeFileSync(newsPath, JSON.stringify(news, null, 2), 'utf8');
    console.log('news.json updated (fixed).');
  }catch(e){ console.error('Failed to write news.json:', e.message); process.exit(4); }
} else {
  console.log('Dry run complete. Use --fix to write fixes. Problems count:', problems);
}

process.exit(problems?1:0);
