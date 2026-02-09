# Deploy folders

This project separates three deployment artifacts/locations so you can manage secrets and outputs safely:

- `deploy/github/` — build output prepared for GitHub Pages (if you prefer to commit built files to a branch).
- `deploy/netlify/` — build output prepared for manual upload or Netlify CLI deploy (typically *do not commit*).

Guidelines
- Do NOT commit `deploy/netlify/` to the repository. It's ignored by `.gitignore` by default.
- `deploy/github/` may be committed if you intend to publish via GitHub Pages by pushing that folder to `gh-pages`/branch.
- Use CI (recommended) to produce `deploy/netlify/` and publish to Netlify using environment variables stored in the Netlify site settings or GitHub Secrets + Netlify integration.

Typical flows
- Local checkout + quick upload (no CI):
  1. Run local build (PowerShell script `build-to-deploy.ps1` on Windows) to populate `deploy/netlify/`.
  2. Use `netlify deploy --prod --dir=deploy/netlify` to push directly.

- Repo-based automatic deploy (recommended):
  1. Commit source files to GitHub.
  2. Configure GitHub Actions or Netlify to run a build step and publish `deploy/netlify` or equivalent output.

Security
- Never store API keys in the repo. Use the `.env.example` as reference and put real keys in:
  - Local: `.env` (ignored by Git).
  - GitHub Actions: repository Secrets (Settings → Secrets).
  - Netlify: Site settings → Build & deploy → Environment.
