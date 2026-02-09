#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'news.json');
if(!fs.existsSync(p)){ console.error('news.json missing'); process.exit(2); }
const txt = fs.readFileSync(p, 'utf8');
const lines = txt.split(/\r?\n/);
let changed = false;
for(let i=0;i<lines.length;i++){
  if(/^\s*\+/.test(lines[i])){
    // remove first '+' after indentation
    lines[i] = lines[i].replace(/^(\s*)\+/, '$1');
    changed = true;
    console.log('Fixed leading + on line', i+1);
  }
}
if(changed){ fs.writeFileSync(p, lines.join('\n'), 'utf8'); console.log('Wrote news.json with leading + removed'); }
else console.log('No leading + found');
