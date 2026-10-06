#!/usr/bin/env bash
# Pousse main vers GitHub avec le jeton du leadgen-launcher (jamais affiché).
# Usage : bash scripts/push.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(grep '^GITHUB_TOKEN=' ~/perso/leadgen-launcher/.env | cut -d= -f2-)
REPO="https://x-access-token:${T}@github.com/pauldutoit/bien-equipe-com.git"
remote=$(git ls-remote "$REPO" refs/heads/main | cut -c1-7)
echo "GitHub main : ${remote} | local : $(git rev-parse --short HEAD)"
git push -q "$REPO" main 2>&1 | sed "s/${T}/***/g"
echo "après push, GitHub main : $(git ls-remote "$REPO" refs/heads/main | cut -c1-7)"
