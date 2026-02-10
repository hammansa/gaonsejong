const fs = require('fs');
const path = require('path');

const workspace = path.resolve(__dirname, '..');
const docsJsonPath = path.join(workspace, 'docs.json');

function findPdfs(dir, relBase) {
  const items = [];
  if (!fs.existsSync(dir)) return items;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    const rel = path.join(relBase, f.name);
    if (f.isDirectory()) items.push(...findPdfs(full, rel));
    else if (f.isFile() && f.name.toLowerCase().endsWith('.pdf')) {
      items.push({ file: rel.replace(/\\/g, '/'), name: f.name });
    }
  }
  return items;
}

function titleFromFilename(name) {
  return name.replace(/[-_]/g, ' ').replace(/\.pdf$/i, '').trim();
}

function main() {
  let docsJson = { categories: ["All", "Strategy", "Roadmap", "IR", "MediaKit"], docs: [] };
  if (fs.existsSync(docsJsonPath)) {
    try { docsJson = JSON.parse(fs.readFileSync(docsJsonPath, 'utf8')); } catch(e) { /* ignore */ }
  }

  // scan ./docs and ./assets for PDFs
  const found = [];
  found.push(...findPdfs(path.join(workspace, 'docs'), 'docs'));
  found.push(...findPdfs(path.join(workspace, 'assets'), 'assets'));

  const docs = found.map(f => ({
    title: titleFromFilename(f.name),
    url: f.file,
    category: f.file.startsWith('docs/') ? 'MediaKit' : 'All'
  }));

  docsJson.docs = docs;
  fs.writeFileSync(docsJsonPath, JSON.stringify(docsJson, null, 2) + '\n', 'utf8');
  console.log('Wrote', docs.length, 'docs to', docsJsonPath);
}

main();
