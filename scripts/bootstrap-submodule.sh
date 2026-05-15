#!/usr/bin/env bash
set -euo pipefail

if [ ! -d .git ]; then
  git init
fi

if [ ! -d vendor/claude-for-legal-cn/.git ] && [ ! -f vendor/claude-for-legal-cn/.git ]; then
  git submodule add https://github.com/drdavid-kor/claude-for-legal-cn.git vendor/claude-for-legal-cn
fi

git remote remove origin >/dev/null 2>&1 || true
git remote add origin git@github.com:drdavid-kor/claude-for-legal-cn-online.git

echo "Bootstrap complete. Review files, run npm install && npm test, then commit and push."
