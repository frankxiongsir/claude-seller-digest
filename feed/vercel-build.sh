#!/bin/sh
# Vercel build: turn data/archive/ into the static feed page in dist/.
# A day that fails validation makes the build fail, so the last good deployment stays live.
set -e
python3 --version
python3 feed/sync_repo.py --no-pull --repo . --work .feed-build --split
rm -rf dist && mkdir -p dist/archive
cp .feed-build/index.html dist/index.html
cp .feed-build/classic.html dist/classic.html
cp -r .feed-build/days dist/days
cp feed/og.png dist/og.png
cp -r public/downloads dist/downloads
cp -r data/archive/. dist/archive/
# Posts taken down under feed/corrections.json must not stay downloadable either.
python3 feed/build_feed.py --scrub dist
echo "dist ready: $(ls dist | tr '\n' ' ')"
