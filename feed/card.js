// Daily share card: reads the built page, takes the same Pro numbers the home page shows,
// and writes <out>/<day>.json (the numbers) and <out>/<day>.html (the card, 1080x1440).
// A screenshot of the HTML becomes the PNG (see .github/workflows/feed-checks.yml).
// Sellers are anonymous on the card on purpose: A, B, C… by price.
// Usage: node feed/card.js <built index.html> <out dir>
"use strict";
const fs = require("fs"), path = require("path");
const [, , pageFile, outDir] = process.argv;
if (!pageFile || !outDir) { console.error("usage: node feed/card.js <index.html> <out dir>"); process.exit(2); }

// ---- run the page script with just enough of a browser around it ----
const html = fs.readFileSync(pageFile, "utf8");
const feed = html.match(/<script id="feed" type="application\/json">([\s\S]*?)<\/script>/)[1];
const details = (html.match(/<script id="details" type="application\/json">([\s\S]*?)<\/script>/) || [, "null"])[1];
const code = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].pop()[1];
const el = (id) => ({ id, innerHTML: "", textContent: id === "feed" ? feed : id === "details" ? details : "", value: "", dataset: {}, style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {}, scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
let card = null;
global.document = { getElementById: el, body: el("body"), querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
global.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollTo() {}, __card: (d) => { card = d; } };
global.localStorage = { getItem: () => null, setItem() {} };
global.location = { hash: "", href: "" };
global.history = { replaceState() {}, pushState() {} };
global.CSS = { escape: (s) => s };
new Function(code)();
if (!card) { console.error("card: the page did not hand over the card numbers"); process.exit(1); }
if (!card.stats || card.rows.length < 3) { console.log("card: fewer than 3 Pro prices in the last 7 days, no card for " + card.day); process.exit(0); }

// ---- wording ----
const WL = { ban_claim: "自称封号包赔", instant_refund: "秒封/KYC 失败可退", first_login: "只保首登", no_ban: "明确不保封号", unstated: "没写售后" };
const WL_SHORT = {
  ban_claim: "卖家说用着被封可退可换，没有核实过的成交",
  instant_refund: "只管交付当下，用着被封不管",
  first_login: "能登录一次就算交付，之后被封不管",
  no_ban: "写明了封号不售后",
  unstated: "没写被封以后怎么办",
};
const money = (n) => "¥" + (Number.isInteger(n) ? n : n.toFixed(1));
const RISK = { high: "高", mid: "中", low: "低" };
const top = card.rows.slice(0, 5), k = top.length, st = card.stats;
const claims = top.filter((r) => r.level === "ban_claim").length;
const headline = claims === 0 ? "没有一家保封号" : claims === k ? k + " 家都自称封号包赔" : "只有 " + claims + " 家自称封号包赔";
// The most common stated level among the cheapest ones explains the headline.
const counts = {};
top.forEach((r) => { counts[r.level] = (counts[r.level] || 0) + 1; });
const main = Object.keys(counts).filter((x) => x !== "unstated").sort((a, b) => counts[b] - counts[a])[0] || "unstated";
const ratio = st.max / st.min, conflicts = card.rows.filter((r) => r.conflict).length;
const line1 = counts[main] + " 家<em>" + WL[main] + "</em>：" + WL_SHORT[main] + "。";
const line2 = "最贵的标到 <em>" + money(st.max) + "</em>" + (ratio >= 1.5 ? "，是最低价的 " + ratio.toFixed(1) + " 倍" : "")
  + (conflicts ? "；" + conflicts + " 家说法前后矛盾。" : "。价格高不代表售后更好。");

const data = { day: card.day, since: card.since, n: card.rows.length, min: st.min, med: st.med, max: st.max, headline, top, line1, line2 };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, card.day + ".json"), JSON.stringify(data, null, 1) + "\n");

// ---- the card ----
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LV_CLASS = { ban_claim: "bc", instant_refund: "ir", first_login: "fl", no_ban: "nb", unstated: "un" };
const rowsHtml = top.map((r, i) => '<div class="row"><span class="nm">卖家 ' + "ABCDE"[i] + '</span><span class="p">' + money(r.price) + (r.from ? "<small>起</small>" : "")
  + '</span><span class="lv-c"><span class="lv ' + LV_CLASS[r.level] + '">' + WL[r.level] + '</span></span><span class="risk ' + r.risk + '">' + RISK[r.risk] + "</span></div>").join("");
const X_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const out = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1440px;overflow:hidden;background:#f6f3ec;font-family:"Noto Sans CJK SC","Noto Sans SC","PingFang SC",sans-serif;color:#1d1b18}
.c{position:absolute;inset:40px;background:#fff;border-radius:36px;padding:48px 52px 40px;display:flex;flex-direction:column}
.c>*{flex-shrink:0}
.top{display:flex;align-items:center;gap:16px;font-size:30px;color:#6b665d;font-weight:700}
.logo{width:56px;height:56px;border-radius:16px;background:#c96442;color:#fff;display:grid;place-items:center;font-size:34px;font-weight:900}
.iss{margin-left:auto;background:#c96442;color:#fff;border-radius:999px;padding:8px 26px;font-size:28px;font-weight:800}
h1{font-size:74px;line-height:1.14;margin-top:24px;font-weight:900;letter-spacing:-1px}
h1 em{font-style:normal;color:#c96442}
.stats{display:flex;gap:18px;margin-top:26px}
.s{flex:1;background:#f6f1e8;border-radius:24px;padding:16px 12px;text-align:center}
.s b{display:block;font-size:60px;font-weight:900;line-height:1.05;color:#c96442}
.s span{font-size:27px;color:#3d3a35;display:block;margin-top:8px;font-weight:700}
h2{font-size:36px;margin-top:26px;font-weight:900;display:flex;align-items:baseline;gap:20px}
h2 small{font-size:25px;color:#8a857b;font-weight:500}
.tbl{margin-top:14px;border-radius:20px;overflow:hidden}
.row{display:flex;align-items:center;gap:16px;padding:10px 32px;font-size:32px;background:#f8f5ef}
.row+.row{margin-top:4px}
.row .nm{width:150px;font-weight:800;white-space:nowrap}
.row .p{width:150px;font-weight:900;color:#c96442;font-size:36px}
.row .p small{font-size:22px;margin-left:2px}
.lv-c{flex:1}
.lv{display:inline-block;border-radius:999px;padding:6px 22px;font-size:28px;font-weight:800}
.fl{background:#fbe3b4;color:#6e4300}.ir{background:#cfe2fb;color:#174f8c}.bc{background:#e3dcf6;color:#4b3592}.nb{background:#f5d6cf;color:#8c2a17}.un{background:#e8e5df;color:#55514a}
.risk{width:76px;text-align:center;font-size:28px;font-weight:900;border-radius:999px;padding:5px 0}
.low{background:#cdeccf;color:#1f6a2c}.mid{background:#fbe3b4;color:#7a4b00}.high{background:#f8cfc8;color:#a8261a}
.take{margin-top:22px;background:#24221f;color:#fff;border-radius:24px;padding:22px 30px;font-size:29px;line-height:1.55;font-weight:700}
.take em{font-style:normal;color:#ffb48f}
.ft{margin-top:auto;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end;font-size:23px;color:#6b665d;line-height:1.5}
.ft b{color:#1d1b18;font-size:27px}
.ft .x{display:flex;align-items:center;gap:8px;color:#1d1b18;font-size:28px;font-weight:700}
</style></head><body><div class="c">
<div class="top"><span class="logo">C</span>Claude 卖家帖 · 买前速查<span class="iss">${esc(card.day.slice(5))} 这期</span></div>
<h1>Claude Pro 代充<br>最便宜的 ${k} 家<br><em>${esc(headline)}</em></h1>
<div class="stats"><div class="s"><b>${money(st.min)}</b><span>最低价</span></div><div class="s"><b>${money(st.med)}</b><span>中位价</span></div><div class="s"><b>${card.rows.length}</b><span>家在卖 · 近 7 天</span></div></div>
<h2>价格最低的 ${k} 家<small>售后按卖家自己写的</small></h2>
<div class="tbl">${rowsHtml}</div>
<div class="take">${line1}<br>${line2}</div>
<div class="ft"><div><b>claude-seller-digest.vercel.app</b><br>每天逐条核对 X 上的卖家帖 · 只摆原话，不推荐卖家</div><div style="text-align:right"><span class="x">${X_ICON}@xudongsheng1945</span>价格为卖家公开标价</div></div>
</div></body></html>
`;
fs.writeFileSync(path.join(outDir, card.day + ".html"), out);
console.log("card: " + card.day + " · " + headline + " · " + card.rows.length + " sellers");
