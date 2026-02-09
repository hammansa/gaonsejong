Dev preview utilities

- `rss-preview.html` and `rss-sources.css` are developer-facing preview tools to visualize RSS/source lists.
- They are safe to keep in the repository, but to avoid accidental public exposure place them under `dev/` and serve only in development.
- If you want them removed from production build or site routing, update your hosting config to ignore or block `/dev/`.

Usage:

Open `dev/rss-preview.html` in a browser (file:// or local dev server). It references `rss-sources.css` in the same folder.
