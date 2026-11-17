#!/bin/sh
# Vercel build: turn data/archive/ into the static feed page in dist/.
# A day that fails validation makes the build fail, so the last good deployment stays live.
set -e
python3 --version
python3 feed/sync_repo.py --no-pull --repo . --work .feed-build
rm -rf dist && mkdir -p dist/archive
cp .feed-build/index.html dist/index.html
cp -r public/downloads dist/downloads
cp -r data/archive/. dist/archive/
echo "dist ready: $(ls dist | tr '\n' ' ')"
