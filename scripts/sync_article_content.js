const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const newsPath = path.join(ROOT, 'news.json');
if(!fs.existsSync(newsPath)){ console.error('news.json not found'); process.exit(2); }

function extractBodyHtml(html){
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = m ? m[1] : html;
  // strip leading/trailing whitespace
  return inner.trim();
}

const news = JSON.parse(fs.readFileSync(newsPath,'utf8'));
let changed = 0;
for(const art of news.articles||[]){
  if(art.articleUrl && (!art.content || art.content.trim()==='' || art.content.trim()==='상세 내용은 준비 중입니다.')){
    const rel = art.articleUrl.replace(/^\//,'');
    const p = path.join(ROOT, rel);
    if(fs.existsSync(p)){
      try{
        const html = fs.readFileSync(p,'utf8');
        const body = extractBodyHtml(html);
        // store a trimmed version for listing (max 4000 chars)
        art.content = body.slice(0, 4000);
        changed++;
        console.log('Updated content for', art.id, 'from', rel);
      }catch(e){ console.warn('failed to read', p, e.message); }
    }else{
      console.warn('articleUrl target missing:', p);
    }
  }
}

if(changed>0){
  fs.writeFileSync(newsPath, JSON.stringify(news, null, 2) + '\n', 'utf8');
  console.log('Wrote news.json with', changed, 'updated contents');
}else{
  console.log('No changes needed');
}
