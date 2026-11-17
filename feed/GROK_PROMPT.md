# Grok bot daily output format (claude-seller-digest/day@1)

Append the section below to the Grok bot's existing task instructions. Keep its existing collection and checking rules (ET calendar-day window, 20 posts, public read-only checks, no contacting sellers, no fabricated metrics). This only changes **the final output**.

---

## Final output

After collecting and checking, output **one JSON object** with no surrounding prose or code fence.

**Where to put it:** commit it to `frankxiongsir/claude-seller-digest` as `data/archive/<date>/day.json` (`<date>` = the ET calendar day of the posts). You can keep committing `posts.json` / `verification.json` as before; when `day.json` exists, the page uses it first. When verification finishes the next day, **overwrite the same day's `day.json`** rather than putting it under the next day's folder. Structure below; `example-day.json` is a complete example for reference.

### Top level

| Field | Type | Notes |
|---|---|---|
| `schema` | string | Always `"claude-seller-digest/day@1"` |
| `date` | string | The ET calendar day of the posts, `YYYY-MM-DD` |
| `window` | object | `{start_utc, end_utc, timezone}` |
| `fetched_at_et` | string | When the posts were fetched, e.g. `2026-11-16 09:35 ET` |
| `verified_at_et` | string | When comments and shop pages were checked |
| `prices_as_of_et` | string | When shop prices were read (optional) |
| `scanned_count` | integer | Unique posts in the window after dedupe (optional) |
| `intro` | string | Short note on scope and exclusion rules (optional) |
| `highlights` | array | Key findings of the day, each `{title, body}`; mention posts as "第 5、11 条" (post 5, 11) |
| `coverage` | array of strings | What was checked, what was not, and why |
| `shared_listings` | array | Same listing text across shops: `{id, note, warranty_quote, prices_cny:{domain: price}}` (optional) |
| `downloads` | array | `{href, label}`, raw files for the day (optional) |
| `posts` | array | 20 posts, see below |

### Each post

| Field | Type | Notes |
|---|---|---|
| `n` | integer | Rank by views that day, starting at 1 |
| `id` / `url` | string | Tweet ID and `https://x.com/...` link |
| `handle` / `name` | string | Account handle (no @) and display name. **Use the same handle for the same seller every day**; the page groups by it |
| `text` | string | Full original post text, unedited |
| `created_at` / `created_at_et` | string | UTC ISO time / `YYYY-MM-DD HH:MM ET` |
| `metrics` | object | `impression_count` (required), `reply_count`, `like_count`, `repost_count`, `quote_count`, `bookmark_count`. **Integers only; omit a field rather than guess** |
| `links` / `promo` | array | Expanded links in the post / promo links |
| `priority` | bool | Marked for priority checking |
| `summary.service` | string | One line on what is sold, e.g. `Claude Pro 成品号，1 个月` (ready-made Claude Pro account, 1 month) |
| `summary.cover` | string | One line on the terms, in the source's own wording, e.g. `原帖写不保封号；商品页只保首登` (post says bans not covered; shop page only covers first login) |
| `summary.diff` | string | One line on the most important difference or gap (empty if none) |
| `summary.price_label` | string | Short price label, e.g. `原帖 ¥240` (post ¥240) / `多档` (several tiers) / `未知` (unknown) |
| `terms.refund_promise` | bool | Post, author comment or shop page offers a refund, compensation or replacement |
| `terms.first_login_only` | bool | Only covers the first login |
| `terms.no_ban` | bool | States that bans are not covered |
| `prices` | array | **One entry per price**, see below |
| `warranty_note` | string | How the terms were classified, in the source's wording |
| `seller_post` / `seller_comment` | string | Seller's own claims / what the author added in comments |
| `landing` | object or null | Shop page: `{url, price, terms}`; if unreadable, add `inaccessible: "reason"` |
| `third_party` | array | Comment excerpts: `{handle, url, created_at_et, quote, note, sentiment}` |
| `conflicts` | array of strings | Contradictions between post, comments and shop page, e.g. `原帖「过kyc」vs 商品页「没过KYC」` (post says "passed KYC" vs shop page "has not passed KYC") |
| `missing` | array of strings | What was not checked |
| `coverage` | string | How much of this post's comments and pages were read |
| `narrative` | string | Full check notes, one point per line starting with `- ` |

### Price entry (`prices[]`)

| Field | Notes |
|---|---|
| `source` | `原帖` (post) / `商品页` (shop page) / `评论` (author comment) / `另一域` (another domain) / `首页` (home page) / `第三方` (third party) / `同帖其他` (other product in the same post) |
| `product` | Name as written, e.g. `Pro 成品` / `item/597` / `Max 5x` |
| `category` | `pro` / `max5` / `max20` (including Ultra) / `kyc` / `teams` / `other` (tier not stated, not Claude, or third-party quotes) |
| `amount` | Number; `null` if no price |
| `currency` | `CNY` / `USD` / `USDT`; required when `amount` is set |
| `currency_assumed` | `true` when the source gives no currency and CNY is assumed |
| `qualifier` | `起` (starting price) / `参考` (reference price) / empty |
| `tier_unstated` | `true` for a ready-made account with no tier stated (e.g. "免 K 成品"), grouped under pro |
| `note` | Notes, e.g. "differs from the post price" |

### Comment sentiment (`third_party[].sentiment`)

- `negative`: first-person bad experiences, e.g. banned, can't log in, password changed, support ignores you, no refund, or calling the seller out
- `positive`: first-person success, e.g. "passed", "all good"
- `neutral`: questions, price quotes, unrelated replies

### Rules

1. Write the terms exactly as stated. Don't turn "first login only", "bans not covered", "稳如老狗" (solid as a rock) or a warranty written for GPT into Claude ban coverage.
2. Never make up missing views, prices or times. Leave them out or write `未写价` (no price given).
3. Comments are self-reported. `note` should say "self-reported, unverified".
4. Don't judge whether a seller is reliable. The page computes the risk score from these fields with fixed rules.
