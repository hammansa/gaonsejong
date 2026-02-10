#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'news.json');
try {
  const src = fs.readFileSync(file, 'utf8');
  const j = JSON.parse(src);
  if (!Array.isArray(j.articles)) {
    console.error('Invalid: news.json must contain an "articles" array');
    process.exit(1);
  }
  const errors = [];
  j.articles.forEach((a, idx) => {
    if (!a.id) errors.push(`article[${idx}] missing id`);
    if (!a.bodyHtml && !a.articleUrl && !a.content) errors.push(`article[${idx}] (${a.id||'?'}) missing bodyHtml/articleUrl/content`);
    if (a.bodyHtml && /<!DOCTYPE|<html/i.test(a.bodyHtml)) {
      errors.push(`article[${idx}] (${a.id||'?'}) contains full HTML document in bodyHtml; extract to file and set articleUrl`);
    }
  });
  if (errors.length) {
    console.error('news.json validation failed:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: news.json valid');
  process.exit(0);
} catch (e) {
  console.error('news.json parse error:\n', e && e.message ? e.message : e);
  process.exit(1);
}
