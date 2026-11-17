#!/usr/bin/env python3
"""Claude seller digest: ingest daily data and build the feed page.

Usage:
  python3 build_feed.py --add DAY.json [DAY2.json ...]   # validate, store, rebuild
  python3 build_feed.py --check DAY.json                 # validate only, store nothing
  python3 build_feed.py                                  # rebuild index.html from data/
  python3 build_feed.py --keep-days 120                  # how many recent days go into the page

Accepted inputs:
  * Day file in format claude-seller-digest/day@1 (what the Grok bot should produce, see GROK_PROMPT.md)
  * Legacy single-day index.html (embedded <script id="data">) or its {"snapshot","briefs"} JSON

Every day is stored as data/<date>.json in day@1 format; re-adding a date replaces it.
Older days stay in data/ even when they fall outside --keep-days.
"""
import argparse, hashlib, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUT = ROOT / "index.html"
SCHEMA = "claude-seller-digest/day@1"
EMBED = re.compile(r'<script id="data" type="application/json">(.*?)</script>', re.S)
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CATEGORIES = {"pro", "max5", "max20", "kyc", "teams", "other"}
CURRENCIES = {"CNY", "USD", "USDT"}
SENTIMENTS = {"negative", "positive", "neutral"}
METRICS = ["impression_count", "reply_count", "like_count", "repost_count", "quote_count", "bookmark_count"]
NEG = re.compile(r"封|挂了|登不上|密码错误|改密码|失败|避雷|不理|打水漂|没有任何保障|沒有任何保障|骗|跑路|不退")


# ---------------------------------------------------------------- validation
def validate(day: dict) -> list:
    """Return a list of human-readable problems (empty = OK)."""
    errs = []
    def need(obj, key, typ, where):
        if key not in obj:
            errs.append(f"{where}: missing '{key}'"); return None
        if typ and not isinstance(obj[key], typ):
            errs.append(f"{where}.{key}: expected {typ.__name__ if isinstance(typ, type) else typ}"); return None
        return obj[key]
    if day.get("schema") != SCHEMA:
        errs.append(f"schema: expected '{SCHEMA}'")
    d = need(day, "date", str, "day")
    if d and not DATE.match(d):
        errs.append("date: must be YYYY-MM-DD (ET calendar day of the posts)")
    for k in ("fetched_at_et", "verified_at_et"):
        need(day, k, str, "day")
    need(day, "highlights", list, "day")
    for i, h in enumerate(day.get("highlights") or []):
        if not isinstance(h, dict) or not h.get("title") or not h.get("body"):
            errs.append(f"highlights[{i}]: needs 'title' and 'body'")
    posts = need(day, "posts", list, "day") or []
    if not posts:
        errs.append("posts: empty")
    seen_n, seen_id = set(), set()
    for i, p in enumerate(posts):
        w = f"posts[{i}]"
        if not isinstance(p, dict):
            errs.append(f"{w}: not an object"); continue
        n = need(p, "n", int, w)
        if n in seen_n: errs.append(f"{w}.n: duplicate {n}")
        seen_n.add(n)
        pid = need(p, "id", str, w)
        if pid in seen_id: errs.append(f"{w}.id: duplicate {pid}")
        seen_id.add(pid)
        for k in ("url", "handle", "name", "text", "created_at_et"):
            need(p, k, str, w)
        if isinstance(p.get("url"), str) and not p["url"].startswith("https://"):
            errs.append(f"{w}.url: must be https")
        m = need(p, "metrics", dict, w) or {}
        for k in METRICS:
            if k in m and not isinstance(m[k], int):
                errs.append(f"{w}.metrics.{k}: must be an integer (omit if unknown, never guess)")
        if "impression_count" not in m:
            errs.append(f"{w}.metrics.impression_count: required for sorting")
        s = need(p, "summary", dict, w) or {}
        for k in ("service", "cover"):
            if not s.get(k): errs.append(f"{w}.summary.{k}: required")
        t = need(p, "terms", dict, w) or {}
        for k in ("refund_promise", "first_login_only", "no_ban"):
            if not isinstance(t.get(k), bool): errs.append(f"{w}.terms.{k}: must be true/false")
        for j, pr in enumerate(p.get("prices") or []):
            pw = f"{w}.prices[{j}]"
            for k in ("source", "product", "category"):
                if not pr.get(k): errs.append(f"{pw}.{k}: required")
            if pr.get("category") and pr["category"] not in CATEGORIES:
                errs.append(f"{pw}.category: one of {sorted(CATEGORIES)}")
            if pr.get("amount") is not None:
                if not isinstance(pr["amount"], (int, float)): errs.append(f"{pw}.amount: number or null")
                if pr.get("currency") not in CURRENCIES: errs.append(f"{pw}.currency: one of {sorted(CURRENCIES)}")
        for j, c in enumerate(p.get("third_party") or []):
            if not c.get("handle") or not c.get("quote"):
                errs.append(f"{w}.third_party[{j}]: needs 'handle' and 'quote'")
            if c.get("sentiment") and c["sentiment"] not in SENTIMENTS:
                errs.append(f"{w}.third_party[{j}].sentiment: one of {sorted(SENTIMENTS)}")
        for k in ("conflicts", "missing", "links"):
            if k in p and not isinstance(p[k], list):
                errs.append(f"{w}.{k}: must be a list")
    return errs


# ---------------------------------------------------------------- legacy -> day@1
def _price(value):
    s = str(value or "")
    if re.search(r"未写|未知|不计入|无零售|未再标价|未标价", s):
        return None
    m = re.search(r"(US\$|\$|¥|￥)?\s*(\d+(?:\.\d+)?)\s*(U|R)?", s)
    if not m:
        return None
    cur = "USD" if m.group(1) in ("US$", "$") else "USDT" if m.group(3) == "U" else "CNY"
    q = "起" if "起" in s else "参考" if re.search(r"参考|约", s) else ""
    amt = float(m.group(2)); amt = int(amt) if amt.is_integer() else amt
    return amt, cur, q, not m.group(1) and not m.group(3)


def _category(row, service):
    n = str(row.get("name", ""))
    if re.search(r"第三方|同帖其他", row.get("src", "")):
        return "other"
    product = re.search(r"成品|item", n, re.I)
    if not product and (re.search(r"KYC|门户|Portal|Identity", n, re.I) or re.match(r"(Claude\s*)?KYC", service, re.I)):
        return "kyc"
    if re.search(r"Teams", service, re.I): return "teams"
    if re.search(r"20x|Ultra", n, re.I): return "max20"
    if re.search(r"5x", n, re.I): return "max5"
    if re.search(r"Max", n, re.I): return "other"
    if re.search(r"Pro|item/597|成品|每月", n, re.I): return "pro"
    return "other"


def legacy_to_day(old: dict) -> dict:
    meta, posts, briefs = old["snapshot"]["meta"], old["snapshot"]["posts"], old["briefs"]
    hl = []
    for raw in meta.get("highlights", []):
        m = re.match(r"^\s*\d+\.\s*\*\*(.+?)\*\*\s*([\s\S]*)$", raw)
        hl.append({"title": m.group(1), "body": m.group(2)} if m else {"title": raw[:40], "body": raw})
    scanned = re.search(r"独立帖\s*(\d+)\s*条", meta.get("digestIntro", ""))
    s597 = meta.get("sharedItem597")
    out_posts = []
    for p in posts:
        b, v = briefs.get(str(p["n"]), {}), p["verification"]
        prices = []
        for r in b.get("rows", []):
            pr = _price(r.get("value"))
            cat = _category(r, b.get("service", ""))
            e = {"source": r.get("src", ""), "product": r.get("name", ""), "category": cat,
                 "amount": pr[0] if pr else None, "currency": pr[1] if pr else None,
                 "qualifier": pr[2] if pr else "", "label": r.get("value", ""), "note": r.get("note", "")}
            if pr and pr[3]: e["currency_assumed"] = True
            if cat == "pro" and not re.search(r"Pro|item/597", r.get("name", "") + " " + b.get("service", ""), re.I):
                e["tier_unstated"] = True
            prices.append(e)
        f = p.get("filters", {})
        out_posts.append({
            "n": p["n"], "id": p["id"], "url": p["url"], "handle": p["handle"], "name": p["name"],
            "text": p["text"], "created_at": p.get("createdAt"), "created_at_et": p["createdAtEt"],
            "metrics": p["metrics"], "links": p.get("expandedLinks", []), "promo": p.get("promo", []),
            "priority": bool(p.get("priority")),
            "summary": {"service": b.get("service", ""), "price_label": b.get("priceLabel", ""),
                        "cover": b.get("cover", ""), "diff": b.get("diff", "")},
            "terms": {"refund_promise": bool(f.get("refund_promise", {}).get("on")),
                      "first_login_only": bool(f.get("first_login", {}).get("on")),
                      "no_ban": bool(f.get("no_ban", {}).get("on"))},
            "warranty_class": p.get("warrantyClass", ""), "warranty_note": p.get("warrantyNote", ""),
            "prices": prices,
            "seller_post": v.get("sellerPost", ""), "seller_comment": v.get("sellerComment") or "",
            "landing": v.get("landing"),
            "third_party": [{"handle": t["handle"], "url": t.get("url"), "created_at_et": t.get("createdAtEt"),
                             "quote": t["quote"], "note": t.get("note", ""),
                             "sentiment": "negative" if NEG.search(t["quote"]) else "neutral"} for t in v.get("thirdParty", [])],
            "conflicts": (v.get("pageMismatches") or []) + (v.get("otherContradictions") or []),
            "missing": v.get("missing", []), "coverage": v.get("coverage", ""), "narrative": v.get("narrative", ""),
        })
    return {
        "schema": SCHEMA, "date": meta["postDateEt"],
        "window": {"start_utc": meta.get("windowStartUtc"), "end_utc": meta.get("windowEndUtc"), "timezone": meta.get("timezone")},
        "fetched_at_et": meta.get("digestFetchedAtEt", ""), "verified_at_et": meta.get("verificationWrittenAtEt", ""),
        "prices_as_of_et": meta.get("pricesAsOfEt", ""),
        "scanned_count": int(scanned.group(1)) if scanned else None,
        "intro": meta.get("digestIntro", ""),
        "highlights": hl, "coverage": meta.get("coverageBullets", []),
        "shared_listings": [{"id": "/item/597", "note": s597.get("note", ""), "warranty_quote": s597.get("warrantyQuote", ""),
                             "prices_cny": s597.get("pricesCny", {})}] if s597 else [],
        "downloads": meta.get("downloads", []),
        "posts": out_posts,
    }


# ---------------------------------------------------------------- day@1 -> page data
def _fmt(pr):
    if pr.get("label"): return pr["label"]
    if pr.get("amount") is None: return "未写价"
    sym = {"CNY": "¥", "USD": "US$", "USDT": ""}.get(pr.get("currency"), "")
    return sym + str(pr["amount"]) + (" U" if pr.get("currency") == "USDT" else "") + (" 起" if pr.get("qualifier") == "起" else "")


def day_to_page(day: dict) -> dict:
    """Convert a day@1 file into the structure the page script reads."""
    posts, briefs = [], {}
    for p in day["posts"]:
        s, t = p["summary"], p["terms"]
        conflicts = p.get("conflicts", [])
        tp = p.get("third_party", [])
        on = lambda flag, basis: {"on": bool(flag), "basis": basis}
        posts.append({
            "n": p["n"], "id": p["id"], "url": p["url"], "handle": p["handle"], "name": p["name"], "text": p["text"],
            "expandedLinks": p.get("links", []), "promo": p.get("promo", []), "createdAt": p.get("created_at"),
            "createdAtEt": p["created_at_et"], "metrics": {k: int(p["metrics"].get(k, 0) or 0) for k in METRICS},
            "warrantyClass": p.get("warranty_class", ""), "warrantyNote": p.get("warranty_note", ""),
            "priority": bool(p.get("priority")), "prices": p.get("prices", []),
            "verification": {
                "coverage": p.get("coverage", ""), "sellerPost": p.get("seller_post", ""),
                "sellerComment": p.get("seller_comment", ""), "landing": p.get("landing") or None,
                "thirdParty": [{"handle": c["handle"], "url": c.get("url"), "createdAtEt": c.get("created_at_et"),
                                "quote": c["quote"], "note": c.get("note", ""), "sentiment": c.get("sentiment")} for c in tp],
                "pageMismatches": conflicts, "otherContradictions": [],
                "missing": p.get("missing", []), "narrative": p.get("narrative", ""),
            },
            "filters": {
                "refund_promise": on(t["refund_promise"], []), "first_login": on(t["first_login_only"], []),
                "no_ban": on(t["no_ban"], []), "page_mismatch": on(conflicts, conflicts),
                "third_party": on(tp, []), "missing_info": on(p.get("missing"), p.get("missing", [])),
            },
        })
        briefs[str(p["n"])] = {
            "service": s["service"], "priceLabel": s.get("price_label") or "", "cover": s["cover"], "diff": s.get("diff", ""),
            "rows": [{"src": pr.get("source", ""), "name": pr.get("product", ""), "value": _fmt(pr), "note": pr.get("note", "")}
                     for pr in p.get("prices", [])],
        }
    shared = (day.get("shared_listings") or [None])[0]
    meta = {
        "postDateEt": day["date"], "windowStartUtc": (day.get("window") or {}).get("start_utc", ""),
        "windowEndUtc": (day.get("window") or {}).get("end_utc", ""), "timezone": (day.get("window") or {}).get("timezone", "America/New_York"),
        "digestFetchedAtEt": day["fetched_at_et"], "verificationWrittenAtEt": day["verified_at_et"],
        "verificationWindowEt": day["verified_at_et"], "pricesAsOfEt": day.get("prices_as_of_et") or day["verified_at_et"],
        "count": len(posts), "priorityPosts": [p["n"] for p in day["posts"] if p.get("priority")],
        "digestIntro": day.get("intro") or (f"窗口内去重后独立帖 {day['scanned_count']} 条。" if day.get("scanned_count") else ""),
        "highlights": [f"{i + 1}. **{h['title']}** {h['body']}" for i, h in enumerate(day.get("highlights", []))],
        "coverageBullets": day.get("coverage", []),
        "sharedItem597": {"note": shared.get("note", ""), "warrantyQuote": shared.get("warranty_quote", ""),
                          "pricesCny": shared.get("prices_cny", {})} if shared else None,
        "sharedListings": [{"id": l.get("id", ""), "note": l.get("note", ""), "warrantyQuote": l.get("warranty_quote", ""),
                            "pricesCny": l.get("prices_cny", {})} for l in (day.get("shared_listings") or []) if l.get("id")],
        "downloads": day.get("downloads", []),
    }
    return {"date": day["date"], "snapshot": {"meta": meta, "posts": posts}, "briefs": briefs}


# ---------------------------------------------------------------- lazy details
DETAIL_V = ("narrative", "coverage", "sellerPost", "sellerComment")


def split_details(page: dict) -> dict:
    """Move fields only shown in an open post (full text, check notes) out of the page index."""
    det = {}
    for p in page["snapshot"]["posts"]:
        v = p["verification"]
        det[p["id"]] = {"text": p["text"], "warrantyNote": p.get("warrantyNote", ""), "v": {k: v.get(k) or "" for k in DETAIL_V}}
        p["text"] = p["text"][:60]  # list fallback title only
        p["warrantyNote"] = ""
        for k in DETAIL_V: v[k] = ""
    return det


def _embed(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")


# ---------------------------------------------------------------- io
def load_input(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() in (".html", ".htm"):
        m = EMBED.search(text)
        if not m: sys.exit(f"{path}: no <script id=\"data\"> block")
        return legacy_to_day(json.loads(m.group(1)))
    obj = json.loads(text)
    if obj.get("schema") == SCHEMA: return obj
    if "snapshot" in obj and "briefs" in obj: return legacy_to_day(obj)
    sys.exit(f"{path}: unknown format (expected schema '{SCHEMA}')")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--add", nargs="*", default=[], type=Path)
    ap.add_argument("--check", nargs="*", default=[], type=Path)
    ap.add_argument("--keep-days", type=int, default=120)
    ap.add_argument("--split", action="store_true", help="write post details to days/<date>.json next to the page (for hosting); default embeds everything in one file")
    a = ap.parse_args()
    bad = False
    for path in a.check + a.add:
        day = load_input(path)
        errs = validate(day)
        if errs:
            bad = True
            print(f"✗ {path}: {len(errs)} problem(s)"); [print("   -", e) for e in errs[:40]]
        else:
            print(f"✓ {path}: {day['date']}, {len(day['posts'])} posts")
            if path in a.add:
                DATA.mkdir(exist_ok=True)
                (DATA / f"{day['date']}.json").write_text(json.dumps(day, ensure_ascii=False, indent=1), encoding="utf-8")
    if bad: sys.exit(1)
    if a.check and not a.add: return
    files = sorted(DATA.glob("*.json"))
    if not files: sys.exit("no days in data/; use --add")
    days = [json.loads(f.read_text(encoding="utf-8")) for f in files][-a.keep_days:]
    for d in days:
        errs = validate(d)
        if errs: sys.exit(f"data/{d.get('date')}.json is invalid: {errs[0]}")
    pages = [day_to_page(d) for d in days]
    details = {pg["date"]: split_details(pg) for pg in pages}
    if a.split:
        ddir = OUT.parent / "days"
        if ddir.exists(): shutil.rmtree(ddir)
        ddir.mkdir(parents=True)
        for pg in pages:
            blob = json.dumps(details[pg["date"]], ensure_ascii=False, separators=(",", ":"))
            (ddir / f"{pg['date']}.json").write_text(blob, encoding="utf-8")
            pg["detail"] = f"days/{pg['date']}.json?v={hashlib.sha1(blob.encode()).hexdigest()[:10]}"
        det_json = "null"
    else:
        det_json = _embed(details)
    tpl = (ROOT / "template.html").read_text(encoding="utf-8")
    for ph in ("__FEED__", "__DETAILS__"):
        if tpl.count(ph) != 1: sys.exit(f"template.html must contain {ph} exactly once")
    OUT.write_text(tpl.replace("__FEED__", _embed({"days": pages})).replace("__DETAILS__", det_json), encoding="utf-8")
    print(f"built {OUT.name}: {len(days)} day(s), {sum(len(d['posts']) for d in days)} posts" + (f", details in {OUT.parent.name}/days/" if a.split else ", single file"))


if __name__ == "__main__":
    main()
