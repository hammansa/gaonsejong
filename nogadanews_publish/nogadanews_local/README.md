# Nogadanews Local Archive

This folder is intended to store local-only files and archives that should not be deployed.

Common items to place here:
- `deploy/` (build and deploy artifacts)
- `dev/` (development previews)
- `logs/`
- `node_modules/` (optional - large)
- local `.env` files
- temporary files like `article.tmp.json`

Do NOT add this folder to the publish bundle. You can keep it in the repo for archival, or add it to `.gitignore` if you prefer to keep it purely local.
