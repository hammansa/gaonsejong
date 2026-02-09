#!/usr/bin/env node
// Repair common JSON string issues in news.json by escaping control characters
// Creates a timestamped backup before writing changes.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const newsPath = path.join(ROOT, 'news.json');
const tmpPath = path.join(ROOT, 'news.json.tmp');

if(!fs.existsSync(newsPath)){
  console.error('news.json not found at', newsPath);
  process.exit(2);
}

const text = fs.readFileSync(newsPath, 'utf8');

// Scan and escape control characters inside JSON string literals
function escapeControlCharsInStrings(input){
  let out = '';
  let inString = false;
  let escaped = false;
  for(let i=0;i<input.length;i++){
    const ch = input[i];
    if(!inString){
      out += ch;
      if(ch === '"') inString = true;
      continue;
    }
    // in string
    if(escaped){
      out += ch; // keep escape sequence as-is
      escaped = false;
      continue;
    }
    if(ch === '\\'){
      out += ch;
      escaped = true;
      continue;
    }
    if(ch === '"'){
      out += ch;
      inString = false;
      continue;
    }
    const code = ch.charCodeAt(0);
    if(code >= 0 && code <= 0x1f){
      // replace common controls with readable escapes where appropriate
      if(ch === '\n') out += '\\n';
      else if(ch === '\r') out += '\\r';
      else if(ch === '\t') out += '\\t';
      else {
        // unicode escape for other control chars
        const hex = code.toString(16).padStart(4,'0');
        out += '\\u' + hex;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

console.log('Creating backup: news.json.bak');
const bakPath = path.join(ROOT, `news.json.bak.${Date.now()}`);
fs.copyFileSync(newsPath, bakPath);

console.log('Scanning and escaping control characters inside string literals...');
const fixed = escapeControlCharsInStrings(text);
fs.writeFileSync(tmpPath, fixed, 'utf8');

try{
  JSON.parse(fixed);
  // parse ok -> replace original
  fs.copyFileSync(tmpPath, newsPath);
  fs.unlinkSync(tmpPath);
  console.log('Repair successful. Original backed up at', bakPath);
  process.exit(0);
}catch(e){
  console.error('Repair attempt produced invalid JSON:', e && e.message);
  console.error('Temporary file written to', tmpPath, 'for inspection. Original backed up at', bakPath);
  process.exit(1);
}
