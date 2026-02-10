const fs = require('fs');
const path = require('path');

const footerMarker = '<!-- NOGADA_FOOTER -->';
const footerHtml = `\n${footerMarker}\n<footer class="nogada-footer" style="border-top:1px solid #eee;padding:20px 0;text-align:center;color:#555;font-size:0.95em;background:#fafafa;">(노)동의 진실함을 믿는 사람들의 · (가)교가 되어주는 따뜻한 정보로 · (다)함께 내일을 만드는 신문<br>제보: 010-3012-9978</footer>\n`;

function findHtmlFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      if (it.name === 'node_modules' || it.name === '.git' || it.name === 'nogadanews_publish') continue;
      results = results.concat(findHtmlFiles(full));
    } else if (it.isFile() && it.name.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function injectFooter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(footerMarker)) return false;
  const idx = content.search(/<\/?body[^>]*>/i);
  // Prefer inserting before closing </body>
  if (/<\/body>/i.test(content)) {
    const updated = content.replace(/<\/body>/i, footerHtml + '</body>');
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  } else {
    // append at end
    fs.writeFileSync(filePath, content + footerHtml, 'utf8');
    return true;
  }
}

function main() {
  const root = path.resolve(__dirname, '..');
  const files = findHtmlFiles(root);
  let changed = 0;
  for (const f of files) {
    try {
      if (injectFooter(f)) changed++;
    } catch (e) {
      console.error('ERR', f, e.message);
    }
  }
  console.log('Processed', files.length, 'HTML files, injected footer into', changed);
}

main();
