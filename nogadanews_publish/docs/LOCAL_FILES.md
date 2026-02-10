# Local-only Files & Folders (Keep out of publish)

These files and folders should be kept locally (or in an archive) and MUST NOT be included in the static publish bundle.

- `.env` — local environment variables (removed from repo). Keep this out of version control and set secrets in CI/Netlify instead.
- `deploy/` — build/deploy artifacts and scripts
- `dev/` — development-only files and previews
- `logs/` — runtime or pipeline logs
- `node_modules/` — dependencies; do not publish
- `package.json` / `package-lock.json` — project metadata and lockfile (keep in repo, but not in `nogadanews_publish/`)
- `.github/` — CI workflows (keep in repo but not in publish)
- `build-to-deploy.ps1`, local build scripts
- `article.tmp.json`, `*.tmp.json` — temporary pipeline files

Recommended actions:
- Use repository secrets (GitHub Actions/Netlify) for API keys; do not store real keys in `.env` files that are committed.
- If secrets were accidentally committed, rotate them and remove them from history (I can help rewrite history if you want).
- Keep `deploy/` and other build artifacts archived (e.g., `nogadanews_archive/`) to avoid accidental publish.
