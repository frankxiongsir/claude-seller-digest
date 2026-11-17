#!/usr/bin/env python3
"""Pull the Grok bot repo and import new days into data/, then rebuild index.html.

Usage:
  python3 sync_repo.py                      # git pull + import + build
  python3 sync_repo.py --no-pull            # use the existing clone
  python3 sync_repo.py --dry-run            # show what would be imported, write nothing

Per archive day (data/archive/YYYY-MM-DD/ in the repo):
  * day.json (format claude-seller-digest/day@1)  -> imported as is (best quality)
  * posts.json [+ verification.json in any archive folder whose post IDs match]
                                                  -> converted by raw_to_day() (heuristic)
Days already in data/ that were NOT produced by the heuristic converter (hand-made or day@1)
are never overwritten by a heuristic conversion. Heuristic days are refreshed on every run,
so a day first imported without verification is upgraded once verification.json lands.
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_feed as bf  # noqa: E402

ROOT = bf.ROOT
REPO_URL = "https://github.com/frankxiongsir/claude-seller-digest"
CLONE = ROOT / ".repo"
ORIGIN = "raw-adapter"

PRICE_TOKEN = re.compile(r"(US\$|\$|¥|￥)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(元|块|[rR][mM][bB]|USDT|USD|usd|美元|美金|刀|R\b|r\b|U\b|u\b)")
OTHER_PRODUCT = re.compile(r"GPT|Gemini|ChatGPT|Grok|Cursor|Midjourney|Muse|Outlook|邮箱|Spotify|Netflix|YouTube|Telegram|tg\s*会员|"
                           r"Windows|Azure|Mac\s*Mini|VPS|Google\s*AI|Copilot|Perplexity|Suno", re.I)
TOPUP = re.compile(r"代充|充值|会员|直充")          # recharge onto the buyer's own account, not a ready-made account
READY = re.compile(r"成品|(?<!自己)(?<!自有)(?<!你的)(?<!您的)账号|帐号|手搓号|老号|普号|美区号")
TIER = re.compile(r"(?<![A-Za-z])Pro(?![A-Za-z])|Max|Ultra|\d+\s*[xX](?![A-Za-z])|KYC|门户|Teams?", re.I)
KYC_ATTR = re.compile(r"(免|过|已过|不弹|免费过)\s*[kK](yc|YC)?", re.I)   # "免kyc 成品" describes an account, not a KYC service
LINE_END = re.compile(r"(?:[，,：:]|——|—)\s*(\d{2,5})\s*$")
BARE_NAME = lambda seg, m: seg[: m.start(1) if m.re is LINE_END else m.start(2)]
BARE = re.compile(r"(Pro|Max\s*\d+\s*[xX]|\d+\s*[xX]|Ultra|KYC|门户验证|Teams|收费|售价|价格)\s*[^\d\n，,。%]{0,4}?(?<![\d.])(\d{2,5})(?![\d.]|\s*(%|％|分钟|天|个?月|小时|核|gb|x|X|条|人|单))")
NEGATED = re.compile(r"(不|无|不做|不予|没有)\s*(退款|退|补偿|换新)")


def git(*args):
    r = subprocess.run(["git", "-c", "core.hooksPath=/dev/null", *args], capture_output=True, text=True,
                       env={"GIT_TERMINAL_PROMPT": "0", "PATH": "/usr/bin:/bin"}, timeout=120)
    if r.returncode:
        sys.exit(f"git {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout.strip()


def pull():
    if (CLONE / ".git").exists():
        git("-C", str(CLONE), "fetch", "-q", "origin")
        git("-C", str(CLONE), "reset", "-q", "--hard", "origin/HEAD")
    else:
        git("clone", "-q", REPO_URL, str(CLONE))
    return git("-C", str(CLONE), "rev-parse", "--short", "HEAD")


# ---------------------------------------------------------------- raw -> day@1 (heuristic)
def _cur(sym, unit):
    if sym in ("US$", "$") or unit in ("刀", "美元", "美金") or (unit or "").upper() == "USD": return "USD"
    if unit and unit.upper() in ("U", "USDT"): return "USDT"
    return "CNY"


def _entries_from(text, source, service, default_cat=None):
    """One price entry per price token found in each line/segment of text."""
    out, prev_cat = [], None
    mixed = bool(OTHER_PRODUCT.search(text or ""))  # post also sells GPT/Gemini etc.
    topup_post = bool(TOPUP.search(text or "")) and not READY.search(text or "")
    body = KYC_ATTR.sub("", text or "")
    tiers = {c for c, rx in (("pro", r"(?<![A-Za-z])Pro(?![A-Za-z])"), ("max5", r"(?<!\d)5\s*[xX](?![A-Za-z])"),
                              ("max20", r"(?<!\d)20\s*[xX](?![A-Za-z])|Ultra"), ("teams", r"Teams?(?![A-Za-z])"))
             if re.search(rx, body, re.I)}
    post_tier = next(iter(tiers)) if len(tiers) == 1 and source == "原帖" else None
    segs, ctx = [], None
    for line in (text or "").split("\n"):
        if re.search(r"claude", line, re.I): ctx = "claude"
        elif OTHER_PRODUCT.search(line): ctx = "other"
        for seg in re.split(r"[；;]|(?<![A-Za-z\d元])/|(?<=\d)\s*[，,]|(?<=[\d元rRuU])\s*[｜|]", line):
            segs.append((seg, ctx))
    for seg, ctx in segs:
        hits = [(m, m.group(1), m.group(2) or m.group(3), m.group(4)) for m in PRICE_TOKEN.finditer(seg)]
        taken = [(m.start(), m.end()) for m, *_ in hits]
        hits += [(m, None, m.group(2), None) for m in BARE.finditer(seg)
                 if not any(a <= m.start(2) < b for a, b in taken)]
        if not hits and TIER.search(seg) and not OTHER_PRODUCT.search(seg):
            hits = [(m, None, m.group(1), None) for m in LINE_END.finditer(seg)]  # "Claude Pro美区账号——免KYC，280"
        for m, sym, num, unit in hits:
            amt = float(num)
            if re.search(r"(另|再|需)?加|补差|\+\s*$", seg[max(0, m.start() - 4): m.start()]):
                continue  # add-on fee, not a product price
            if amt < 10 or re.search(r"\d\s*(个?月|天|小时|核|gb|x)", seg[m.end(): m.end() + 3], re.I):
                continue
            amt = int(amt) if amt.is_integer() else amt
            if OTHER_PRODUCT.search(seg): is_other = True
            elif re.search(r"claude", seg, re.I) or not mixed: is_other = False
            else: is_other = ctx == "other" or (ctx is None and not TIER.search(seg))
            src = "同帖其他" if is_other else source
            name = re.sub(r"\s+", " ", seg[: m.start()] if sym or unit else BARE_NAME(seg, m)).strip(" ：:🔥-—|·")[-24:] or service[:24] or "未注明"
            cat = "other" if src == "同帖其他" or "普号" in seg else bf._category({"name": KYC_ATTR.sub("", name + " " + seg), "src": src}, KYC_ATTR.sub("", service))
            if cat == "other" and src == source and post_tier and "普号" not in seg and not re.search(r"Max", seg, re.I):
                cat = post_tier  # the post only sells one tier
            if cat == "other" and src == source and prev_cat in ("kyc", "teams") and not re.search(r"Pro|Max|Ultra|\dx", seg, re.I):
                cat = prev_cat  # next tier of the same KYC/Teams price list
            if cat == "other" and default_cat: cat = default_cat
            topup = cat in ("pro", "max5", "max20", "teams") and (topup_post or (TOPUP.search(seg) and not READY.search(seg)))
            if topup: cat = "other"
            if src == source: prev_cat = cat
            e = {"source": src, "product": name, "category": cat, "amount": amt,
                 "currency": _cur(sym, unit), "qualifier": "起" if "起" in seg else "参考" if "参考" in seg else "",
                 "note": "代充，不计入成品号排名（自动提取）" if topup else "自动提取"}
            if not sym and (not unit or unit in ("元", "块") or unit.upper() in ("R", "RMB")):
                e["currency_assumed"] = not unit
            out.append(e)
    return out


def _landing(raw):
    if not raw: return None
    raw = dict(raw)
    price_bits = [(k[6:].replace("_", " ") + " " if k not in ("price", "prices") else "") + str(raw.pop(k))
                  for k in list(raw) if k.startswith("price")]
    other = [str(raw.pop(k)) for k in list(raw) if k.startswith("sister") or k.startswith("other_domain")]
    terms_bits = [str(raw.pop(k)) for k in list(raw) if k not in ("url", "inaccessible")]
    out = {"url": raw.get("url", ""), "price": "；".join(price_bits), "terms": "；".join(terms_bits)}
    if not price_bits and raw.get("quote"): out["price_text"] = str(raw["quote"])  # verbatim shop text; prices may be inside
    if raw.get("inaccessible"): out["inaccessible"] = raw["inaccessible"]
    if other: out["other_domains"] = "；".join(other)
    return out


def raw_to_day(posts_doc: dict, ver: dict | None, archive_rel: str, ver_rel: str = "") -> dict:
    vby = {x["id"]: x for x in (ver or {}).get("posts", [])}
    prio = set((ver or {}).get("priority_posts", []))
    num = lambda p, k: p.get("metrics", {}).get(k) if isinstance(p.get("metrics", {}).get(k), (int, float)) else 0
    posts = sorted(posts_doc["posts"], key=lambda p: (-num(p, "impression_count"), -num(p, "reply_count"), -num(p, "like_count")))
    out = []
    for n, p in enumerate(posts, 1):
        v = vby.get(p["id"], {})
        land = _landing(v.get("landing"))
        wc, note = p.get("warranty_class", ""), p.get("warranty_note", "")
        lterms = (land or {}).get("terms", "")
        sc = v.get("seller_comment") or ""
        own_text = "" if "do_not_borrow" in wc else p["text"]
        service = v.get("seller_post") or note.split("。")[0]
        prices = _entries_from(own_text if "do_not_borrow" not in wc else
                               "\n".join(l for l in p["text"].splitlines() if re.search(r"claude", l, re.I)),
                               "原帖", service)
        if land and (land.get("price") or land.get("price_text")):
            prices += _entries_from(land.get("price") or land["price_text"], "商品页", service, default_cat="pro" if "/item/597" in land["url"] else None)
        if land: land.pop("price_text", None)  # already shown verbatim under terms
        if land and land.get("other_domains"):
            prices += [e for e in _entries_from(re.sub(r"[，,]?\s*与.*$", "", land["other_domains"]), "另一域", service)]
        seen, uniq = set(), []
        for e in prices:
            k = (e["source"], e["category"], e["amount"], e["currency"])
            if k not in seen: seen.add(k); uniq.append(e)
        prices = uniq
        allterms = " ".join([note, lterms, own_text])
        no_ban = "no_ban" in wc or bool(re.search(r"不保封|封号不保|不包封|封号不在质保|不质保封号|封号.{0,6}无售后|封号不做退款", allterms))
        first_login = "first_login" in wc or bool(re.search(r"(只|仅)保首登|仅质保首登|质保首登", lterms + " " + own_text + " " + sc))
        no_ban = no_ban or first_login  # first-login-only cover means later bans are not covered
        refund_src = " ".join([note if "refund" in wc else "", lterms, sc])
        refund = "refund" in wc or any(not NEGATED.search(refund_src[max(0, m.start() - 4): m.end()])
                                       for m in re.finditer(r"退款|换新|补偿|退差价|换号", refund_src))
        tp = [{"handle": t["handle"], "url": t.get("url"), "created_at_et": t.get("created_at_et"), "quote": t["quote"],
               "note": t.get("note", "自述，未证实"),
               "sentiment": "negative" if bf.NEG.search(t["quote"]) else "neutral"} for t in v.get("third_party", [])]
        own = [e for e in prices if e["source"] in ("原帖", "商品页") and e["category"] != "other"]
        plabel = "未知" if not own else ("多档" if len({(e["category"], e["amount"]) for e in own}) > 2 else
                                       " / ".join(f"{e['source']} {bf._fmt(e)}" for e in own[:2]))
        conflicts = list(v.get("conflicts") or [])
        missing = list(v.get("missing") or ([] if v else ["当日核查尚未提交（verification.json 未到）"]))
        narr = [f"- 原帖：{v['seller_post']}" if v.get("seller_post") else "",
                f"- 作者评论：{sc}" if sc else "",
                f"- 商品页 {land['url']}：{land['price'] or '未读到价格'}；{land['terms']}" if land else "",
                f"- 商品页未能读取：{land['inaccessible']}" if land and land.get("inaccessible") else "",
                *[f"- 矛盾：{c}" for c in conflicts], *[f"- 未核到：{m}" for m in missing]]
        out.append({
            "n": n, "id": p["id"], "url": p["url"], "handle": p["handle"], "name": p.get("name") or p["handle"],
            "text": p["text"], "created_at": p.get("created_at"), "created_at_et": p["created_at_et"],
            "metrics": {k: x for k, x in p.get("metrics", {}).items() if k in bf.METRICS},  # validate() rejects non-integers
            "links": re.findall(r"https?://\S+", p["text"]), "promo": v.get("promo", []), "priority": v.get("n") in prio,
            "summary": {"service": service or "未写明", "cover": note.rstrip("。 ") or "未写条款", "diff": conflicts[0] if conflicts else "",
                        "price_label": plabel},
            "terms": {"refund_promise": refund, "first_login_only": first_login, "no_ban": no_ban},
            "warranty_class": wc, "warranty_note": note, "prices": prices,
            "seller_post": v.get("seller_post", ""), "seller_comment": sc, "landing": land,
            "third_party": tp, "conflicts": conflicts, "missing": missing,
            "coverage": v.get("coverage", "未核查" if not v else ""), "narrative": "\n".join(x for x in narr if x),
        })
    w = posts_doc.get("window") or {}
    shared = (ver or {}).get("shared_item_597_shops")
    return {
        "schema": bf.SCHEMA, "origin": ORIGIN, "source_dir": archive_rel,
        "date": posts_doc["post_date_et"],
        "window": {"start_utc": w.get("start_utc"), "end_utc": w.get("end_utc"), "timezone": w.get("timezone")},
        "fetched_at_et": posts_doc.get("fetched_at_et", ""),
        "verified_at_et": (ver or {}).get("written_at_et") or (ver or {}).get("fetched_at_et") or "未核查",
        "intro": "本日条目由原始 posts.json / verification.json 自动转换：价格、条款开关为规则提取，未经人工整理。",
        "highlights": _highlights(out, ver),
        "coverage": [x for x in [(ver or {}).get("method"), None if ver else "本日核查文件尚未提交"] if x],
        "shared_listings": [{"id": "/item/597", "note": shared.get("note", ""), "warranty_quote": shared.get("warranty_quote", ""),
                             "prices_cny": shared.get("prices_cny", {})}] if shared else [],
        "downloads": _downloads(archive_rel, ver_rel),
        "posts": out,
    }


def _downloads(archive_rel, ver_rel):
    """Links to the raw files; the deploy copies data/archive/ to archive/ next to index.html."""
    web = lambda rel: re.sub(r"^data/", "", rel)
    out = [{"href": web(archive_rel) + "/posts.json", "label": "原始帖 JSON"}]
    if ver_rel: out.append({"href": web(ver_rel), "label": "核查 JSON"})
    return out


def _highlights(posts, ver):
    nums = lambda ps: "、".join(str(p["n"]) for p in ps)
    hl = []
    if not ver:
        hl.append({"title": "核查未提交", "body": "本日只有原帖，评论区和商品页核查文件还没到；到了以后页面会自动补全。"})
    c = [p for p in posts if p["conflicts"]]
    if c: hl.append({"title": f"{len(c)} 条说法前后矛盾", "body": f"第 {nums(c)} 条：原帖、评论和商品页的说法对不上。"})
    r = [p for p in posts if p["terms"]["refund_promise"]]
    if r: hl.append({"title": f"{len(r)} 条有退款说法", "body": f"第 {nums(r)} 条在原帖、作者评论或商品页提到退款、补偿或换号。"})
    nb = [p for p in posts if p["terms"]["no_ban"]]
    if nb: hl.append({"title": f"{len(nb)} 条不保封号", "body": f"第 {nums(nb)} 条只保首登或写明封号不保。"})
    hl.append({"title": "自动整理", "body": "本日由原始文件按规则转换，价格和条款开关未经人工复核。"})
    return hl


# ---------------------------------------------------------------- scan repo
def scan(repo: Path):
    arch = repo / "data" / "archive"
    vers = []
    for f in sorted(arch.glob("*/verification.json")):
        try: vers.append((f, json.loads(f.read_text(encoding="utf-8"))))
        except Exception as e: print(f"! skip {f.relative_to(repo)}: {e}")
    days, errors = {}, {}
    for d in sorted(x for x in arch.iterdir() if x.is_dir() and bf.DATE.match(x.name)):
        rel = str(d.relative_to(repo))
        try:
            _scan_one(d, rel, repo, vers, days)
        except Exception as e:  # malformed file: report it instead of a traceback
            errors[d.name] = f"{rel}: cannot read ({type(e).__name__}: {e})"
    return days, errors


def _scan_one(d, rel, repo, vers, days):
    if True:
        if (d / "day.json").exists():
            days[d.name] = (json.loads((d / "day.json").read_text(encoding="utf-8")), rel + "/day.json")
        elif (d / "posts.json").exists():
            pd = json.loads((d / "posts.json").read_text(encoding="utf-8"))
            ids = {p["id"] for p in pd["posts"]}
            match = max(vers, key=lambda fv: len(ids & {x["id"] for x in fv[1].get("posts", [])}), default=None)
            ver = match[1] if match and ids & {x["id"] for x in match[1].get("posts", [])} else None
            src = rel + "/posts.json" + (f" + {match[0].relative_to(repo)}" if ver else "")
            day = raw_to_day(pd, ver, rel, str(match[0].relative_to(repo)) if ver else "")
            days[day["date"]] = (day, src)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-pull", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--repo", type=Path, default=CLONE)
    ap.add_argument("--work", type=Path, help="build in this folder: copy curated days from data/ there, leave data/ untouched")
    a = ap.parse_args()
    if a.work:
        work = a.work.resolve() / "data"
        if work.exists(): shutil.rmtree(work)
        work.mkdir(parents=True)
        for f in bf.DATA.glob("*.json"): shutil.copy(f, work / f.name)
        bf.DATA, bf.OUT = work, a.work.resolve() / "index.html"
    if not a.no_pull:
        print("repo at", pull())
    bad, changed = False, 0
    days, read_errors = scan(a.repo)
    for date, msg in read_errors.items():
        bad = True; print(f"✗ {date}: {msg}")
    for date, (day, src) in sorted(days.items()):
        errs = bf.validate(day)
        if errs:
            bad = True
            print(f"✗ {date} ({src}): {len(errs)} problem(s)"); [print("   -", e) for e in errs[:20]]
            continue
        target = bf.DATA / f"{date}.json"
        if target.exists() and day.get("origin") == ORIGIN:
            cur = json.loads(target.read_text(encoding="utf-8"))
            if cur.get("origin") != ORIGIN:
                print(f"= {date}: kept curated data/{date}.json (repo only has raw files)"); continue
        new = json.dumps(day, ensure_ascii=False, indent=1)
        if target.exists() and target.read_text(encoding="utf-8") == new:
            print(f"= {date}: unchanged"); continue
        print(f"{'would import' if a.dry_run else '+'} {date}: {len(day['posts'])} posts from {src}"
              + (" [heuristic]" if day.get("origin") == ORIGIN else ""))
        if not a.dry_run:
            bf.DATA.mkdir(exist_ok=True); target.write_text(new, encoding="utf-8"); changed += 1
    if a.dry_run: sys.exit(1 if bad else 0)
    if bad and a.work:
        sys.exit("✗ build stopped: fix the files above (the last good deployment stays live)")
    sys.argv = ["build_feed.py"]; bf.main()
    print(f"{changed} day(s) imported or updated")
    if bad: sys.exit(1)


if __name__ == "__main__":
    main()
