// Static, search-indexable pages next to the single-page app.
// Reads the built page, takes the same numbers the app shows (through window.__seo),
// and writes plain HTML pages that work without JavaScript:
//   s/<seller>/index.html   one page per seller
//   s/index.html            all sellers
//   d/<date>/index.html     one page per issue (day)
//   c/<category>/index.html last-7-days price table per product (pro, max5, ...)
//   sitemap.xml, robots.txt
// Usage: node feed/seo.js <built index.html> <out dir> [base url]
"use strict";
const fs = require("fs"), path = require("path");
const [, , pageFile, outDir, baseArg] = process.argv;
if (!pageFile || !outDir) { console.error("usage: node feed/seo.js <index.html> <out dir> [base url]"); process.exit(2); }
// Change this (or pass it) when the site moves to its own domain; every canonical link follows.
const BASE = (baseArg || process.env.SITE_URL || "https://claude-seller-digest.vercel.app").replace(/\/$/, "");
const REPO = "https://github.com/frankxiongsir/claude-seller-digest";
const X_URL = "https://x.com/xudongsheng1945";

// ---- run the page script with just enough of a browser around it ----
const html = fs.readFileSync(pageFile, "utf8");
const feed = html.match(/<script id="feed" type="application\/json">([\s\S]*?)<\/script>/)[1];
const details = (html.match(/<script id="details" type="application\/json">([\s\S]*?)<\/script>/) || [, "null"])[1];
const code = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].pop()[1];
const el = (id) => ({ id, innerHTML: "", textContent: id === "feed" ? feed : id === "details" ? details : "", value: "", dataset: {}, style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {}, scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
let D = null;
global.document = { getElementById: el, body: el("body"), querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
global.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollTo() {}, __seo: (d) => { D = d; } };
global.localStorage = { getItem: () => null, setItem() {} };
global.location = { hash: "", href: "" };
global.history = { replaceState() {}, pushState() {} };
global.CSS = { escape: (s) => s };
new Function(code)();
if (!D) { console.error("seo: the page did not hand over its data"); process.exit(1); }

// ---- helpers ----
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const md = (d) => d.slice(5);
const RISK = { high: "高", mid: "中", low: "低" };
const WL_CLASS = { ban_claim: "bc", instant_refund: "ir", first_login: "fl", no_ban: "nb", unstated: "un" };
const wl = (k) => '<span class="wl ' + WL_CLASS[k] + '">' + esc(D.WL[k]) + "</span>";
const appLink = (hash) => "/#" + hash;
const sellerUrl = (s) => "/s/" + encodeURIComponent(s.key) + "/";
const range = (ds) => (ds[0] === ds[ds.length - 1] ? ds[0] : ds[0] + " 至 " + ds[ds.length - 1]);

const CSS = `
:root{--bg:#f6f3ec;--card:#fff;--ink:#1d1b18;--muted:#6b665d;--line:#ece7dd;--soft:#f6f1e8;--acc:#c96442;
--fl-b:#fbe3b4;--fl-f:#6e4300;--ir-b:#cfe2fb;--ir-f:#174f8c;--bc-b:#e3dcf6;--bc-f:#4b3592;--nb-b:#f5d6cf;--nb-f:#8c2a17;--un-b:#e8e5df;--un-f:#55514a;
--lo-b:#cdeccf;--lo-f:#1f6a2c;--mi-b:#fbe3b4;--mi-f:#7a4b00;--hi-b:#f8cfc8;--hi-f:#a8261a}
@media (prefers-color-scheme:dark){:root{--bg:#171614;--card:#211f1c;--ink:#ece8e1;--muted:#a39d92;--line:#33302b;--soft:#2a2724;--acc:#e07a55;
--fl-b:#4a3611;--fl-f:#f5cf86;--ir-b:#173352;--ir-f:#9cc5f5;--bc-b:#30284d;--bc-f:#c7b8f2;--nb-b:#4d241c;--nb-f:#f2a99a;--un-b:#33302b;--un-f:#c9c4bb;
--lo-b:#1b3d22;--lo-f:#9ad7a4;--mi-b:#4a3611;--mi-f:#f5cf86;--hi-b:#4d1f1a;--hi-f:#f4a397}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.top{background:var(--card);border-bottom:1px solid var(--line)}
.bar{max-width:880px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--ink)}
.logo{width:30px;height:30px;border-radius:9px;background:var(--acc);color:#fff;display:grid;place-items:center;font-weight:900}
.bar nav{display:flex;gap:16px;font-size:15px}.bar nav a{color:var(--muted)}
.bar .sp{flex:1}.bar .soc{display:flex;gap:14px;font-size:14px}.bar .soc a{color:var(--ink);font-weight:600}
main{max-width:880px;margin:0 auto;padding:20px 20px 40px}
.crumb{font-size:14px;color:var(--muted)}.crumb a{color:var(--muted)}
h1{font-size:30px;line-height:1.3;margin:10px 0 4px}
.sub{color:var(--muted);font-size:14px;margin:0}
.answer{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:14px;padding:16px 20px;margin:20px 0}
.answer h2{font-size:15px;color:var(--muted);margin:0 0 6px;font-weight:600}
.answer p{margin:0;font-size:17px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.c{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.c .k{font-size:13px;color:var(--muted)}
.c .v{font-size:26px;font-weight:800;line-height:1.3;margin-top:2px}
.c .v.acc{color:var(--acc)}
.c .n{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.5}
.wl,.rk{display:inline-block;border-radius:999px;padding:1px 10px;font-size:14px;font-weight:700;white-space:nowrap}
.c .v .wl,.c .v .rk{font-size:18px;padding:3px 12px}
.fl{background:var(--fl-b);color:var(--fl-f)}.ir{background:var(--ir-b);color:var(--ir-f)}.bc{background:var(--bc-b);color:var(--bc-f)}.nb{background:var(--nb-b);color:var(--nb-f)}.un{background:var(--un-b);color:var(--un-f)}
.rk.low{background:var(--lo-b);color:var(--lo-f)}.rk.mid{background:var(--mi-b);color:var(--mi-f)}.rk.high{background:var(--hi-b);color:var(--hi-f)}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin-top:16px}
section h2{font-size:18px;margin:0 0 10px}
section h2 small{font-size:13px;color:var(--muted);font-weight:400;margin-left:8px}
ul.plain{margin:0;padding:0;list-style:none}
ul.plain li{padding:8px 0;border-top:1px solid var(--line)}ul.plain li:first-child{border-top:0;padding-top:0}
.muted{color:var(--muted);font-size:14px}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:8px 6px;border-top:1px solid var(--line);vertical-align:top}
th{font-size:13px;color:var(--muted);font-weight:600;border-top:0}
td.num{font-weight:700;white-space:nowrap}
.rule td:last-child{color:var(--muted);font-size:14px}
.pts{font-weight:800;white-space:nowrap}.pts.z{color:var(--muted);font-weight:400}
.post h3{font-size:16px;margin:0 0 4px}
.post p{margin:2px 0;font-size:15px}
.post .lk{font-size:14px;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
.cta{display:block;text-align:center;background:var(--acc);color:#fff;border-radius:12px;padding:12px;margin-top:20px;font-weight:700}
.cta:hover{text-decoration:none;opacity:.92}
footer{max-width:880px;margin:0 auto;padding:0 20px 40px;color:var(--muted);font-size:13px}
footer a{color:var(--muted);text-decoration:underline}
@media (max-width:640px){h1{font-size:24px}.cards{grid-template-columns:1fr}.c .v{font-size:22px}
.bar{gap:10px;padding:10px 14px;flex-wrap:nowrap}.bar nav,.soc .gh{display:none}.brand,.soc a{white-space:nowrap}.bar .soc{font-size:13px}main{padding:16px 14px 32px}section{padding:14px 16px}
.rule tr{display:grid;grid-template-columns:1fr auto;padding:8px 0;border-top:1px solid var(--line)}.rule td{border:0;padding:0}.rule td:last-child{grid-column:1/-1;margin-top:2px}
th.opt,td.opt{display:none}}
`;

function shell({ title, desc, url, crumbs, body, updated }) {
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: BASE + c.url })) };
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(BASE + url)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Claude 卖家帖">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(BASE + url)}"><meta property="og:image" content="${esc(BASE)}/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${CSS}</style></head><body>
<header class="top"><div class="bar"><a class="brand" href="/"><span class="logo">C</span>Claude 卖家帖</a>
<nav><a href="/">买前速查</a><a href="/c/pro/">Pro 价格</a><a href="/s/">全部卖家</a><a href="/d/">每期汇总</a></nav><span class="sp"></span>
<span class="soc"><a href="${X_URL}" rel="noopener">X<span class="full"> @xudongsheng1945</span></a><a class="gh" href="${REPO}" rel="noopener">GitHub</a></span></div></header>
<main><div class="crumb">${crumbs.map((c, i) => (i < crumbs.length - 1 ? '<a href="' + esc(c.url) + '">' + esc(c.name) + "</a>" : esc(c.name))).join(" › ")}</div>
${body}
</main>
<footer>本页只整理 X 上的公开帖子、商品页和评论区原话，不构成购买建议，也不推荐任何卖家。数据更新于 ${esc(updated)}。
发现写错了，或你是这位卖家想更正？<a href="${REPO}/issues/new?template=correction.yml" rel="noopener">提交更正或下架</a>，也可以私信 <a href="${X_URL}" rel="noopener">X @xudongsheng1945</a>。</footer>
</body></html>
`;
}

// ---- seller pages ----
function sellerPage(s) {
  const posts = s.posts.slice().sort((a, b) => (a.day !== b.day ? (a.day < b.day ? 1 : -1) : a.p.n - b.p.n));
  const ds = Array.from(new Set(posts.map((x) => x.day))).sort();
  const services = Array.from(new Set(posts.map((x) => x.b.service).filter(Boolean)));
  // Latest stated after-sales level, and where it came from.
  const stated = s.hist.filter((h) => h.level);
  const lvNow = stated.length ? stated[stated.length - 1] : null;
  const lvChange = s.levelChanges[s.levelChanges.length - 1];
  // Prices: each category's lowest current CNY price, with its rank among all sellers on record.
  const prices = D.sellerPrices(s).filter((e) => e.cur === "CNY").map((e) => ({ e, rank: D.priceRank(e), st: D.priceStats(e.cat) }));
  const main = prices.find((x) => x.e.cat === "pro") || prices[0];
  const neg = s.neg.length, conf = s.conf.length;
  const flags = s.rules.filter((r) => r.pts).sort((a, b) => b.pts - a.pts);

  // The one-paragraph answer that "XX 靠谱吗" searches should land on.
  const parts = [];
  if (main) parts.push("最近一次标价 " + D.CATLABEL(main.e.cat) + " ¥" + main.e.best + (main.e.bestObs.from ? " 起" : "")
    + "（收录的 " + main.rank.of + " 家里第 " + main.rank.pos + " 低，中位价 ¥" + main.st.med + "）。");
  if (lvNow) parts.push("最新售后说法是「" + D.WL[lvNow.level] + "」（" + md(lvNow.day) + "）" + (lvChange && lvChange.day === lvNow.day ? "，" + md(lvChange.fromDay) + " 时还是「" + D.WL[lvChange.from] + "」" : "") + "。");
  else parts.push("帖子和商品页都没写封号以后怎么办。");
  parts.push("按公开记录算，风险" + RISK[s.level] + "（" + s.total + " 分）" + (flags.length ? "：" + flags.slice(0, 3).map((r) => r.t + (r.t === "说法前后矛盾" ? " " + conf + " 处" : r.t === "评论区负面自述" ? " " + neg + " 条（未证实）" : "")).join("，") : "，没查到红旗，但这不代表可靠") + "。");
  const answer = parts.join("");

  const cards = '<div class="cards">'
    + '<div class="c"><div class="k">最低标价</div><div class="v acc">' + (main ? "¥" + main.e.best + (main.e.bestObs.from ? '<small style="font-size:14px"> 起</small>' : "") : "未标价") + "</div>"
    + '<div class="n">' + (main ? esc(D.CATLABEL(main.e.cat)) + " · " + main.rank.of + " 家里第 " + main.rank.pos + " 低" : "没有可比的人民币价格") + "</div></div>"
    + '<div class="c"><div class="k">售后说法</div><div class="v">' + wl(lvNow ? lvNow.level : "unstated") + '</div><div class="n">' + esc(D.WL_TIP[lvNow ? lvNow.level : "unstated"]) + "</div></div>"
    + '<div class="c"><div class="k">卖家风险</div><div class="v"><span class="rk ' + s.level + '">' + RISK[s.level] + " · " + s.total + " 分</span></div>"
    + '<div class="n">' + (flags.length ? esc(flags.slice(0, 2).map((r) => r.t).join("、")) : "没查到红旗，不代表可靠") + "</div></div></div>";

  let body = "<h1>" + esc(s.name) + "（@" + esc(s.handle) + "）</h1>"
    + '<p class="sub">Claude 代充卖家 · ' + posts.length + " 条帖 · " + esc(range(ds)) + (s.shops.length ? " · " + esc(s.shops.join("、")) : "") + "</p>"
    + '<div class="answer"><h2>这家靠谱吗？先看公开记录</h2><p>' + esc(answer) + "</p></div>"
    + cards;

  if (conf) body += "<section><h2>说法前后矛盾<small>" + conf + " 处</small></h2><ul class=\"plain\">"
    + s.conf.map((c) => "<li>" + esc(c.text) + ' <span class="muted">（' + esc(c.day ? md(c.day) + " " : "") + "第 " + c.n + " 条）</span></li>").join("") + "</ul></section>";

  if (s.levelChanges.length) body += "<section><h2>售后说法变化</h2><ul class=\"plain\">"
    + s.levelChanges.map((c) => "<li>" + esc(c.day) + "：" + wl(c.from) + " → " + wl(c.to) + ' <span class="muted">（对比 ' + esc(md(c.fromDay)) + "）</span></li>").join("") + "</ul></section>";

  const priceRows = [];
  s.series.forEach((se) => se.pts.forEach((p) => priceRows.push({ cat: se.cat, cur: se.cur, ...p })));
  priceRows.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  if (priceRows.length) body += "<section><h2>价格记录<small>每天取这家标的最低价</small></h2><table><thead><tr><th>日期</th><th>商品</th><th>价格</th><th class=\"opt\">出处</th></tr></thead><tbody>"
    + priceRows.map((r) => "<tr><td>" + esc(md(r.day)) + "</td><td>" + esc(D.CATLABEL(r.cat)) + '</td><td class="num">' + esc(D.fmtPrice({ cur: r.cur, amount: r.amount })) + (r.from ? " 起" : "") + '</td><td class="opt muted">' + esc(r.src) + "</td></tr>").join("")
    + "</tbody></table></section>";

  if (s.groups.length) body += "<section><h2>同源线索</h2><ul class=\"plain\">"
    + s.groups.map((g) => "<li>" + esc(D.GROUP_TAG[g.kind]) + "：" + esc(g.label) + ' <span class="muted">· 共 ' + g.members.length + " 家："
      + g.members.map((m) => (m === s ? esc(m.name) : '<a href="' + sellerUrl(m) + '">' + esc(m.name) + "</a>")).join("、") + "</span></li>").join("") + "</ul></section>";

  // Third-party comments are summarised without the commenters' handles.
  body += "<section><h2>风险分怎么算<small>0–24 低，25–49 中，50 以上高</small></h2><table class=\"rule\"><tbody>"
    + s.rules.map((r) => {
      const d = r.t === "评论区负面自述" ? (neg ? neg + " 条评论自述被封、登不上或客服不理等，均未证实" : "本次摘录的评论里没有负面自述") : r.d;
      return "<tr><td>" + esc(r.t) + '</td><td class="pts' + (r.pts ? "" : " z") + '">' + (r.pts ? "+" + r.pts : "0") + "</td><td>" + esc(d) + "</td></tr>";
    }).join("")
    + '</tbody></table><p class="muted" style="margin:10px 0 0">分数只按公开记录机械计算，分低只说明这次没查到问题。</p></section>';

  body += "<section><h2>帖子<small>" + posts.length + " 条，新的在前</small></h2><ul class=\"plain\">"
    + posts.map((x) => '<li class="post"><h3>' + esc(x.day) + " · " + esc(x.b.service || "原帖") + "</h3>"
      + (x.b.priceLabel ? "<p>价格：" + esc(x.b.priceLabel) + "</p>" : "")
      + (x.b.cover ? "<p>售后：" + (x.p.warrantyLevel ? wl(x.p.warrantyLevel) + " " : "") + esc(x.b.cover) + "</p>" : "")
      + '<div class="lk"><a href="' + esc(x.p.url) + '" rel="nofollow noopener">X 原帖</a><a href="' + appLink("v=all&i=" + encodeURIComponent(x.id)) + '">逐条核对</a></div></li>').join("")
    + "</ul></section>";

  body += '<a class="cta" href="' + appLink("v=all&i=" + encodeURIComponent("seller:" + s.key)) + '">看原文、商品页条款和评论出处 →</a>';

  const title = s.name + "（@" + s.handle + "）Claude 代充靠谱吗？价格、售后与风险记录";
  const desc = answer.length > 150 ? answer.slice(0, 148) + "…" : answer;
  return shell({ title: title + " | Claude 卖家帖", desc, url: sellerUrl(s), updated: D.LAST_DAY,
    crumbs: [{ name: "首页", url: "/" }, { name: "全部卖家", url: "/s/" }, { name: s.name, url: sellerUrl(s) }], body });
}

const CAT_TITLE = { pro: "Claude Pro 代充多少钱", max5: "Claude Max 5x 代充多少钱", max20: "Claude Max 20x / Ultra 代充多少钱", kyc: "Claude KYC 验证代办多少钱", teams: "Claude Teams 代充多少钱" };
const catUrl = (k) => "/c/" + k + "/";
const dayUrl = (d) => "/d/" + d + "/";
const sellerByHandle = (h) => D.sellers.get(String(h).toLowerCase());
const sLink = (s) => '<a href="' + sellerUrl(s) + '">' + esc(s.name) + "</a>";
const riskTag = (s) => '<span class="rk ' + s.level + '">' + RISK[s.level] + " " + s.total + "</span>";
const lastLevel = (s) => { const st = s.hist.filter((h) => h.level); return st.length ? st[st.length - 1].level : "unstated"; };
const lastDay = (s) => s.posts.reduce((a, x) => (x.day > a ? x.day : a), "");
const catNav = (cur) => '<p class="muted" style="margin:14px 0 0">其他商品：' + D.HOME_CATS.filter((c) => c.key !== cur).map((c) => '<a href="' + catUrl(c.key) + '">' + esc(c.label) + "</a>").join(" · ") + "</p>";
const EXTRA_CSS = `<style>.tbl td,.tbl th{white-space:nowrap}.tbl td.w{white-space:normal}.tbl .rk{font-size:13px;padding:0 8px}.tbl .wl{font-size:13px;padding:0 8px}
.hl{margin:0;padding-left:20px}.hl li{margin:6px 0}.cnt{font-size:14px;color:var(--muted)}
@media (max-width:640px){.tbl{font-size:14px}.tbl td,.tbl th{padding:7px 3px}.tbl td.w{min-width:84px}.tbl .wl{white-space:normal;font-size:12px;padding:2px 6px;border-radius:6px;line-height:1.35;display:inline-block;max-width:7.5em}.tbl .hd{display:none}.tbl .rk{font-size:12px;padding:0 6px}.scroll{overflow-x:auto;margin:0 -16px;padding:0 16px}}</style>`;
const withCss = (h) => h.replace("</head>", EXTRA_CSS + "</head>");

// ---- category price pages ----
function catPage(c) {
  const rows = D.homeRows(c.key), st = D.priceStats(c.key, rows);
  const lvCount = {};
  rows.forEach((e) => { const k = D.levelFor(e).k; lvCount[k] = (lvCount[k] || 0) + 1; });
  const claim = lvCount.ban_claim || 0;
  const answer = "最近 7 天（" + D.SINCE + " 至 " + D.LAST_DAY + "）X 上有 " + rows.length + " 家公开标了 " + c.long + " 的人民币价格：最低 ¥" + st.min + "，中位 ¥" + st.med + "，最高 ¥" + st.max + "。"
    + (claim ? "其中只有 " + claim + " 家自称封号包赔，" : "没有一家自称封号包赔，") + "售后说法最多的是「" + D.WL[Object.keys(lvCount).sort((a, b) => lvCount[b] - lvCount[a])[0]] + "」。";
  const body = "<h1>" + esc(CAT_TITLE[c.key] || c.long) + "？</h1>"
    + '<p class="sub">' + esc(c.long) + " · 最近 7 天 " + rows.length + " 家 · 每天更新，最近一期 " + esc(D.LAST_DAY) + "</p>"
    + '<div class="answer"><h2>先看结论</h2><p>' + esc(answer) + "</p></div>"
    + '<div class="cards"><div class="c"><div class="k">最低价</div><div class="v acc">¥' + st.min + '</div></div><div class="c"><div class="k">中位价</div><div class="v">¥' + st.med + '</div><div class="n">共用商品页的几家算 1 个来源</div></div><div class="c"><div class="k">在卖</div><div class="v">' + rows.length + ' 家</div><div class="n">' + esc(D.SINCE.slice(5)) + " 起的帖子</div></div></div>"
    + "<section><h2>价格从低到高<small>每家取最近一次标的最低人民币价</small></h2><div class=\"scroll\"><table class=\"tbl\"><thead><tr><th>#</th><th>卖家</th><th>价格</th><th>售后</th><th>风险</th><th class=\"opt\">最近</th></tr></thead><tbody>"
    + rows.map((e, i) => { const lv = D.levelFor(e); return "<tr><td class=\"cnt\">" + (i + 1) + '</td><td class="w">' + sLink(e.seller) + '</td><td class="num">' + esc(D.fmtPrice(e.bestObs)) + (e.bestObs.from ? " 起" : "") + "</td><td>" + wl(lv.k) + "</td><td>" + riskTag(e.seller) + '</td><td class="opt cnt">' + esc(md(e.obs[0].day)) + "</td></tr>"; }).join("")
    + "</tbody></table></div><p class=\"muted\" style=\"margin:10px 0 0\">价格低不代表条款更好。售后按卖家自己写的说法归类，风险分只按公开记录机械计算，都不是购买建议。</p>" + catNav(c.key) + "</section>"
    + "<section><h2>「售后」几种说法是什么意思</h2><ul class=\"plain\">" + Object.keys(D.WL).map((k) => "<li>" + wl(k) + " " + esc(D.WL_TIP[k]) + "</li>").join("") + "</ul></section>"
    + '<a class="cta" href="/#home&c=' + c.key + '">在买前速查里筛选和对比 →</a>';
  return withCss(shell({ title: (CAT_TITLE[c.key] || c.long) + "？最近 7 天 " + rows.length + " 家卖家价格与售后对比 | Claude 卖家帖", desc: answer, url: catUrl(c.key), updated: D.LAST_DAY,
    crumbs: [{ name: "首页", url: "/" }, { name: c.label + " 价格", url: catUrl(c.key) }], body }));
}

// ---- issue (day) pages ----
function dayPage(day, i, all) {
  const meta = day.snapshot.meta, posts = day.snapshot.posts.slice().sort((a, b) => a.n - b.n);
  const hls = (meta.highlights || []).map((h) => { const m = h.replace(/^\d+\.\s*/, "").match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/); return m ? { t: m[1], b: m[2] } : { t: h, b: "" }; });
  const ch = D.dayChanges(day.date);
  const prev = all[i + 1], next = all[i - 1];
  const intro = day.date + " 这期收录 X 上 " + posts.length + " 条 Claude 代充卖家帖，逐条对照原帖、商品页和评论区。" + (hls.length ? "值得注意：" + hls.slice(0, 2).map((h) => h.t).join("；") + "。" : "");
  let body = "<h1>" + esc(day.date) + " Claude 代充卖家帖汇总</h1>"
    + '<p class="sub">' + posts.length + " 条帖 · " + new Set(posts.map((p) => p.handle.toLowerCase())).size + " 家卖家</p>"
    + '<div class="answer"><h2>这期说了什么</h2><p>' + esc(intro) + "</p></div>";
  if (hls.length) body += "<section><h2>值得注意</h2><ul class=\"plain\">" + hls.map((h) => "<li><b>" + esc(h.t) + "</b><br><span class=\"muted\">" + esc(h.b) + "</span></li>").join("") + "</ul></section>";
  if (ch && (ch.price.length || ch.levels.length)) {
    body += "<section><h2>和上一期比<small>对比 " + esc(ch.prev) + "</small></h2><ul class=\"plain\">";
    const seen = new Set();
    ch.price.forEach((x) => { if (seen.has(x.s)) return; seen.add(x.s); body += "<li>" + sLink(x.s) + " " + esc(D.CATLABEL(x.cat)) + "：" + esc(D.fmtPrice(x.from)) + " → " + esc(D.fmtPrice(x.to)) + ' <span class="muted">(' + (x.pct > 0 ? "+" : "") + Math.round(x.pct * 100) + "%)</span></li>"; });
    ch.levels.forEach((x) => { body += "<li>" + sLink(x.s) + " 售后：" + wl(x.from) + " → " + wl(x.to) + "</li>"; });
    body += "</ul></section>";
  }
  body += "<section><h2>这期的帖子<small>" + posts.length + " 条</small></h2><ul class=\"plain\">"
    + posts.map((p) => { const s = sellerByHandle(p.handle), b = day.briefs[String(p.n)] || {}; return '<li class="post"><h3>' + p.n + ". " + (s ? sLink(s) : esc(p.name)) + " · " + esc(b.service || "") + "</h3>"
      + "<p>" + (p.warrantyLevel ? wl(p.warrantyLevel) + " " : "") + (s ? riskTag(s) + " " : "") + '<span class="muted">' + esc(b.priceLabel || "") + "</span></p>"
      + '<div class="lk"><a href="' + esc(p.url) + '" rel="nofollow noopener">X 原帖</a><a href="' + appLink("v=all&i=" + encodeURIComponent("p:" + p.id + "@" + day.date)) + '">逐条核对</a></div></li>'; }).join("")
    + "</ul></section>"
    + '<p class="muted" style="margin-top:16px;display:flex;justify-content:space-between">' + (prev ? '<a href="' + dayUrl(prev.date) + '">← ' + esc(prev.date) + "</a>" : "<span></span>") + (next ? '<a href="' + dayUrl(next.date) + '">' + esc(next.date) + " →</a>" : "<span></span>") + "</p>"
    + '<a class="cta" href="' + appLink("v=day%3A" + day.date + "&i=" + encodeURIComponent("d:" + day.date)) + '">看这期的完整简报 →</a>';
  return withCss(shell({ title: day.date + " Claude 代充卖家帖汇总：" + posts.length + " 条帖逐条核对 | Claude 卖家帖", desc: intro.length > 150 ? intro.slice(0, 148) + "…" : intro, url: dayUrl(day.date), updated: day.date,
    crumbs: [{ name: "首页", url: "/" }, { name: "每期汇总", url: "/d/" }, { name: day.date, url: dayUrl(day.date) }], body }));
}
function dayIndex(all) {
  const body = "<h1>每期汇总</h1><p class=\"sub\">每天一期，汇总 X 上公开的 Claude 代充卖家帖</p><section><ul class=\"plain\">"
    + all.map((d) => '<li><a href="' + dayUrl(d.date) + '">' + esc(d.date) + "</a> <span class=\"muted\">· " + d.snapshot.posts.length + " 条帖</span></li>").join("") + "</ul></section>";
  return withCss(shell({ title: "每期汇总：Claude 代充卖家帖 | Claude 卖家帖", desc: "每天汇总 X 上公开的 Claude 代充卖家帖，逐条对照原帖、商品页和评论区。共 " + all.length + " 期。", url: "/d/", updated: D.LAST_DAY,
    crumbs: [{ name: "首页", url: "/" }, { name: "每期汇总", url: "/d/" }], body }));
}

// ---- all sellers ----
function sellerIndex(list) {
  const body = "<h1>全部卖家</h1><p class=\"sub\">收录 " + list.length + " 家 Claude 代充卖家，按最近出现时间排列</p>"
    + "<section><div class=\"scroll\"><table class=\"tbl\"><thead><tr><th>卖家</th><th>售后</th><th>风险</th><th class=\"opt\">帖子</th><th>最近</th></tr></thead><tbody>"
    + list.map((s) => '<tr><td class="w">' + sLink(s) + ' <span class="cnt hd">@' + esc(s.handle) + "</span></td><td>" + wl(lastLevel(s)) + "</td><td>" + riskTag(s) + '</td><td class="opt cnt">' + s.posts.length + '</td><td class="cnt">' + esc(md(lastDay(s))) + "</td></tr>").join("")
    + "</tbody></table></div></section>"
    + "<section><h2>按商品看价格</h2><ul class=\"plain\">" + D.HOME_CATS.map((c) => '<li><a href="' + catUrl(c.key) + '">' + esc(CAT_TITLE[c.key] || c.long) + "</a></li>").join("") + "</ul></section>";
  return withCss(shell({ title: "全部 Claude 代充卖家：售后说法与风险记录 | Claude 卖家帖", desc: "收录 " + list.length + " 家在 X 上公开卖 Claude 账号或代充的卖家，逐条核对价格、售后说法和评论区记录，每天更新。", url: "/s/", updated: D.LAST_DAY,
    crumbs: [{ name: "首页", url: "/" }, { name: "全部卖家", url: "/s/" }], body }));
}

// ---- write everything ----
const write = (rel, content) => { const f = path.join(outDir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const urls = [{ loc: "/", mod: D.LAST_DAY }];
const sellerList = Array.from(D.sellers.values()).sort((a, b) => (lastDay(b) > lastDay(a) ? 1 : lastDay(b) < lastDay(a) ? -1 : b.posts.length - a.posts.length));
sellerList.forEach((s) => { write("s/" + s.key + "/index.html", sellerPage(s)); urls.push({ loc: sellerUrl(s), mod: lastDay(s) }); });
write("s/index.html", sellerIndex(sellerList)); urls.push({ loc: "/s/", mod: D.LAST_DAY });
D.days.forEach((d, i, all) => { write("d/" + d.date + "/index.html", dayPage(d, i, all)); urls.push({ loc: dayUrl(d.date), mod: d.date }); });
write("d/index.html", dayIndex(D.days)); urls.push({ loc: "/d/", mod: D.LAST_DAY });
D.HOME_CATS.forEach((c) => { write("c/" + c.key + "/index.html", catPage(c)); urls.push({ loc: catUrl(c.key), mod: D.LAST_DAY }); });
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => "<url><loc>" + esc(BASE + u.loc.split("/").map(encodeURIComponent).join("/")) + "</loc><lastmod>" + u.mod + "</lastmod></url>").join("\n") + "\n</urlset>\n");
write("robots.txt", "User-agent: *\nAllow: /\nDisallow: /classic.html\nSitemap: " + BASE + "/sitemap.xml\n");
console.log("seo: " + sellerList.length + " sellers, " + D.days.length + " issues, " + D.HOME_CATS.length + " price pages, " + urls.length + " urls in sitemap");
