# Secrets and API key handling

This document describes where to keep secrets and how to configure them for local/dev and CI environments.

Principles
- Never commit real API keys or files containing them (e.g., `.env`, `GEMINI_API_KEY.env`).
- Use the provided `.env.example` as a template for local development.
- Use repository/organization secrets for CI and Netlify environment variables.

Local development
- Copy `.env.example` to `.env` and fill with real values only on your machine:

  ```powershell
  copy .env.example .env
  # then edit .env with your editor and add real keys
  ```

- `.env` is ignored by `.gitignore`.

GitHub Actions
- Set secrets in the repository: `GENSPARK_API_KEY`, `GENSPARK_MODEL`, and optionally `GENSPARK_BASE_URL`.
- The workflow `.github/workflows/gaonsejong-news.yml` references these secrets.

Netlify
- In Netlify dashboard, go to Site settings → Build & deploy → Environment and add the same keys there.
- For preview deploys, Netlify exposes `DEPLOY_PRIME_URL` and `CONTEXT` which the `src/index.netlify.html` placeholders can use at build time.

Audit
- If you accidentally commit secrets, rotate them immediately and remove them from history.

Contact
- If you need assistance adding secrets to GitHub or Netlify, I can prepare step-by-step instructions or a GitHub Actions snippet to help.
