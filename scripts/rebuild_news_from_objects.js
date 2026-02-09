const fs = require('fs');
const IN='news.json';
const OUT='news.json.rebuilt';
const BAK='news.json.rebuild.bak';
if(!fs.existsSync(IN)){
  console.error('Input file missing:', IN); process.exit(2);
}
const src = fs.readFileSync(IN,'utf8');
fs.writeFileSync(BAK, src, 'utf8');
console.log('Backup written to', BAK);
const articlesKey = '"articles"';
const ak = src.indexOf(articlesKey);
if(ak === -1){ console.error('No "articles" key found'); process.exit(3); }
const arrStart = src.indexOf('[', ak);
if(arrStart === -1){ console.error('No array start for articles'); process.exit(4); }

// Scan for top-level objects inside the articles array using a robust state machine
let i = arrStart + 1;
const n = src.length;
let inString = false;
let esc = false;
let depth = 0;
let startIdx = -1;
const objects = [];
for(; i<n; i++){
  const ch = src[i];
  if(inString){
    if(esc) esc = false;
    else if(ch === '\\') esc = true;
    else if(ch === '"') inString = false;
    continue;
  }
  if(ch === '"') { inString = true; continue; }
  if(ch === '{'){
    if(depth === 0) startIdx = i;
    depth++;
    continue;
  }
  if(ch === '}'){
    depth--;
    if(depth === 0 && startIdx !== -1){
      const objStr = src.slice(startIdx, i+1);
      objects.push(objStr);
      startIdx = -1;
    }
    continue;
  }
}

console.log('Extracted objects count:', objects.length);

function repairControlChars(objText){
  // Replace unescaped control chars inside JSON string literals with \u00XX
  let out = '';
  let inStr = false;
  let esc = false;
  for(let j=0;j<objText.length;j++){
    const ch = objText[j];
    const code = ch.charCodeAt(0);
    if(inStr){
      if(esc){ out += ch; esc = false; continue; }
      if(ch === '\\'){ out += ch; esc = true; continue; }
      if(ch === '"'){ inStr = false; out += ch; continue; }
      if(code < 0x20 && ch !== '\n' && ch !== '\r' && ch !== '\t'){
        const hx = code.toString(16).padStart(2,'0'); out += '\\u00'+hx; continue;
      }
      out += ch;
    } else {
      if(ch === '"'){ inStr = true; out += ch; continue; }
      out += ch;
    }
  }
  return out;
}

const parsed = [];
for(let k=0;k<objects.length;k++){
  const raw = objects[k];
  try{
    parsed.push(JSON.parse(raw));
  }catch(e){
    // attempt repair
    const repaired = repairControlChars(raw);
    try{
      parsed.push(JSON.parse(repaired));
      console.log('Repaired object', k);
    }catch(e2){
      console.error('Failed to parse object', k, 'skipping');
    }
  }
}

const outObj = { articles: parsed };
fs.writeFileSync(OUT, JSON.stringify(outObj, null, 2), 'utf8');
console.log('Wrote', OUT, 'with', parsed.length, 'articles');
// Overwrite news.json with rebuilt file
fs.copyFileSync(OUT, IN);
console.log('Replaced', IN, 'with rebuilt file');
