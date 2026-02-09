#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const newsPath = path.join(ROOT, 'news.json');

if(!fs.existsSync(newsPath)){
  console.error('news.json not found'); process.exit(2);
}

const text = fs.readFileSync(newsPath, 'utf8');
const backup = path.join(ROOT, `news.json.plusfix.bak.${Date.now()}`);
fs.copyFileSync(newsPath, backup);

const fixed = text.replace(/\n\+\s*\{/g, '\n    {');
if(fixed === text){
  console.log('No +{ patterns found. Backup created at', backup);
  process.exit(0);
}
fs.writeFileSync(newsPath, fixed, 'utf8');
console.log('Rewrote news.json (removed leading + before object). Backup at', backup);
process.exit(0);
