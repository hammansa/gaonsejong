#!/usr/bin/env bash
set -euo pipefail

# Netlify env vars:
# - DEPLOY_PRIME_URL: Deploy Preview / Branch deploy / Production base URL
# - CONTEXT: production / deploy-preview / branch-deploy etc.
BASE_URL="${DEPLOY_PRIME_URL:-}"
CTX="${CONTEXT:-}"

if [ -z "$BASE_URL" ]; then
  echo "DEPLOY_PRIME_URL is empty. Are you running on Netlify?"
  exit 1
fi

echo "Replacing placeholders with:"
echo "  BASE_URL=$BASE_URL"
echo "  CONTEXT=$CTX"

# Files to replace; add more if your site uses other pages
FILES=("index.html" "newsroom.html" "article.html" "docs.html" "about.html")

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    sed -i "s|__DEPLOY_PRIME_URL__|$BASE_URL|g" "$f"
    sed -i "s|__CONTEXT__|$CTX|g" "$f"
  fi
done

echo "Placeholder replacement complete."
