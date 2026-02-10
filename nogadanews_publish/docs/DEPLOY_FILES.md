# Deploy (Publish) File Manifest

This document lists the static files included in `nogadanews_publish/` that are intended for deployment (Netlify / static upload).

Files and folders (relative to repository root):

- nogadanews_publish/index.html
- nogadanews_publish/article.html
- nogadanews_publish/artical.html  # intentional redirect for legacy links
- nogadanews_publish/newsroom.html
- nogadanews_publish/about.html
- nogadanews_publish/style.css
- nogadanews_publish/news.json
- nogadanews_publish/manifest.json
- nogadanews_publish/site.webmanifest
- nogadanews_publish/assets/
  - header.mp4
  - logo.png
  - logo.svg
  - logo-mark.svg
  - logo11.png
  - worker.jpg
  - icons/
  - thumbs/

Notes and recommendations:
- These are client-side static assets only — no server code or CI secrets should be included.
- Media files (e.g. `header.mp4`, `thumbs/`) can be large. Consider optimizing or hosting large media on a CDN if bandwidth or size is a concern.
- Do NOT include any `.env` files or other secret material in the publish bundle.
- If you want me to produce a ZIP of `nogadanews_publish/` or run a Netlify CLI draft deploy, say so.
