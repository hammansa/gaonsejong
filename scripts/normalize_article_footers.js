const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const canonicalFooter = `<!-- NOGADA_FOOTER -->\n<footer class="nogada-footer" style="border-top:1px solid #eee;padding:20px 0;text-align:center;color:#555;font-size:0.95em;background:#fafafa;">(노)동의 진실함을 믿는 사람들의 · (가)교가 되어주는 따뜻한 정보로 · (다)함께 내일을 만드는 신문<br>제보: 010-3012-9978</footer>\n`;

function walk(dir, arr){
  if(!fs.existsSync(dir)) return arr;
  const files = fs.readdirSync(dir);
  files.forEach(f=>{
    const p = path.join(dir,f);
    const s = fs.statSync(p);
    if(s.isDirectory()) walk(p,arr);
    else if(f.endsWith('.html')) arr.push(p);
  });
  return arr;
}

function removeExistingFooter(s){
  return s.replace(/<!--\s*NOGADA_FOOTER\s*-->[\s\S]*?<footer[^>]*class="nogada-footer"[\s\S]*?<\/footer>\s*/gi,'');
}

function hasFooter(s){
  return /<footer[^>]*class\s*=\s*"nogada-footer"/i.test(s);
}

function insertFooterNearPublicationInfo(s){
  // Look for publication info keywords and insert footer right above that block
  const pubRegex = /(?=\n?\s*(<div[^>]*>|<p[^>]*>|<section[^>]*>|<address[^>]*>|<!--[^>]*-->)*[^\n]{0,200}(발행인|편집자|지주회사|발행인:|편집장|발행인\s*:))/i;
  // If found, insert before match
  if(pubRegex.test(s)){
    return s.replace(pubRegex, canonicalFooter+'$&');
  }
  // otherwise insert before closing </body>
  if(/<\/body>/i.test(s)){
    return s.replace(/<\/body>/i, canonicalFooter+'<\/body>');
  }
  // fallback: append at end
  return s + '\n' + canonicalFooter;
}

// Targets: article_pages, nogadanews_archive, nogadanews_local, root nogada_article_*, tmp_*.html
const targets = [];
walk(path.join(repoRoot,'article_pages'), targets);
walk(path.join(repoRoot,'nogadanews_archive'), targets);
walk(path.join(repoRoot,'nogadanews_local'), targets);
// root patterns
const rootFiles = fs.readdirSync(repoRoot).filter(f=>/^nogada_article_/.test(f) || /^tmp_/.test(f)).map(f=>path.join(repoRoot,f));
targets.push(...rootFiles);

let changed = 0;
for(const file of Array.from(new Set(targets))){
  try{
    let s = fs.readFileSync(file,'utf8');
    const orig = s;
    // remove existing duplicated footers
    s = removeExistingFooter(s);
    // ensure canonical footer is present somewhere near publication info or at end, but do NOT add if template/footer already exists in this file
    if(!hasFooter(s)){
      s = insertFooterNearPublicationInfo(s);
    }
    if(s !== orig){
      fs.writeFileSync(file,s,'utf8');
      console.log('Updated:', file);
      changed++;
    }
  }catch(e){
    console.error('Error processing', file, e.message);
  }
}
console.log('Done. Files changed:', changed);
process.exit(0);
