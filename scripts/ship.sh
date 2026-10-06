#!/usr/bin/env bash
# Build de contrôle, commit avec le message de .git/COMMIT_MSG_TMP, push.
# Usage : bash scripts/ship.sh <chemins à ajouter...>
set -euo pipefail
cd "$(dirname "$0")/.."
npx astro build 2>&1 | grep -E "ERROR|page\(s\) built" || true
if npx astro build >/dev/null 2>&1; then :; else echo "BUILD EN ÉCHEC, rien n'est poussé"; exit 1; fi
git add "$@"
git commit -q -F .git/COMMIT_MSG_TMP
rm -f .git/COMMIT_MSG_TMP
git log --oneline -1
bash scripts/push.sh
