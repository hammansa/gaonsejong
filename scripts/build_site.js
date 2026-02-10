#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'nogadanews_publish');
const excludes = new Set(['.git', 'node_modules', 'nogadanews_publish', '.netlify', '.githooks', '.vscode', 'deploy']);

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) rimraf(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

function copyRecursive(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    for (const name of fs.readdirSync(src)) {
      if (excludes.has(name)) continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else if (stat.isSymbolicLink()) {
    try { const target = fs.readlinkSync(src); fs.symlinkSync(target, dest); } catch(e){}
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  // recreate output dir
  if (fs.existsSync(out)) rimraf(out);
  fs.mkdirSync(out);

  // copy root contents except excludes
  for (const name of fs.readdirSync(root)) {
    if (excludes.has(name)) continue;
    // skip hidden config files that shouldn't be published
    if (name === 'package-lock.json') continue;
    copyRecursive(path.join(root, name), path.join(out, name));
  }

  // ensure publish dir has index.html
  if (!fs.existsSync(path.join(out, 'index.html'))) {
    console.warn('Warning: index.html not found in project root — ensure your site has an index.html');
  }

  console.log('Build complete. Output:', out);
  process.exit(0);
} catch (e) {
  console.error('Build failed:', e && e.stack ? e.stack : e);
  process.exit(1);
}
