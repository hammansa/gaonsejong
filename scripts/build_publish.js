const fs = require('fs');
const path = require('path');

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copy(src, dest){
  if(!fs.existsSync(src)) return false;
  const stat = fs.statSync(src);
  if(stat.isDirectory()){
    fs.cpSync(src, dest, { recursive: true });
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
  return true;
}

const repoRoot = path.resolve(__dirname, '..');
const out = path.join(repoRoot, 'nogadanews_publish');
ensureDir(out);

// list of top-level files to copy into publish
const files = [
  'index.html','article.html','newsroom.html','artical.html','news.json','style.css','manifest.json','site.webmanifest'
];

// copy files
for(const f of files){
  const s = path.join(repoRoot, f);
  const d = path.join(out, f);
  copy(s,d);
}

// copy assets directory
copy(path.join(repoRoot,'assets'), path.join(out,'assets'));

console.log('build_publish: completed');
