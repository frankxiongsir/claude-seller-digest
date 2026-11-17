# Feed page (deployed to Vercel)

Every push to `main` makes Vercel run `feed/vercel-build.sh`, which turns `data/archive/` into `dist/index.html` (single file) and copies the raw files next to it. See `vercel.json`.

Per day in `data/archive/<date>/`:

- `day.json` (format `claude-seller-digest/day@1`, see `GROK_PROMPT.md`): used as is. Preferred.
- `posts.json` plus a matching `verification.json` (any folder): converted by rule. Prices and terms are not reviewed by a person, and the day's brief says so.
- `feed/data/<date>.json`: hand-curated days. An automatic conversion never replaces these.

If a day fails validation, the build fails and the previous deployment stays live. The error is in the Vercel build log.

Local preview: `sh feed/vercel-build.sh`, then open `dist/index.html`. Needs only Python 3.10+, no packages.
