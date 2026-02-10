const fs = require('fs');
const path = require('path');
function backup(file){
  const bak = file + '.bak.' + Date.now();
  fs.copyFileSync(file, bak);
  console.log('backup created:', bak);
}
const newsPath = path.resolve(__dirname, '..', 'news.json');
const addsPath = path.resolve(__dirname, 'new_articles.json');
if(!fs.existsSync(newsPath)){
  console.error('news.json not found at', newsPath);
  process.exit(2);
}
if(!fs.existsSync(addsPath)){
  console.error('new_articles.json not found at', addsPath);
  process.exit(2);
}
backup(newsPath);
const news = JSON.parse(fs.readFileSync(newsPath,'utf8'));
const adds = JSON.parse(fs.readFileSync(addsPath,'utf8'));
news.articles = news.articles || [];
const existingIds = new Set(news.articles.map(a=>a.id));
const existingSlugs = new Set(news.articles.map(a=>a.slug));
let added=0, skipped=0;
for(const a of adds){
  if(existingIds.has(a.id) || existingSlugs.has(a.slug)){
    console.log('skip duplicate id/slug:', a.id, a.slug);
    skipped++;
    continue;
  }
  news.articles.push(a);
  existingIds.add(a.id);
  existingSlugs.add(a.slug);
  added++;
}
fs.writeFileSync(newsPath, JSON.stringify(news, null, 2));
console.log('merge complete. added=', added, 'skipped=', skipped);
