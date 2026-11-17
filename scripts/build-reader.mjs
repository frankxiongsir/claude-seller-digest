import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(root, "data/snapshot.json"), "utf8"));
snapshot.meta.downloads = snapshot.meta.downloads.map((item) => ({
  ...item,
  href: item.href.replace(/^\//, ""),
}));
const briefs = JSON.parse(fs.readFileSync(path.join(root, "scripts/briefs.json"), "utf8"));
if (Object.keys(briefs).length !== 20) throw new Error("briefs must cover 20 posts");
for (const post of snapshot.posts) {
  if (!briefs[String(post.n)]) throw new Error("missing brief " + post.n);
}

const payload = JSON.stringify({ snapshot, briefs }).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claude 卖家条款对照 · 2026-11-15 ET</title>
<style>
  :root {
    color-scheme: light;
    --bg: #fff;
    --bar: #f5f5f7;
    --ink: #1d1d1f;
    --muted: #6e6e73;
    --line: #e3e3e6;
    --blue: #007aff;
    --chip: #e8f1fe;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 16px/1.5 "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif;
  }
  button, input, summary { font: inherit; color: inherit; }
  button { cursor: pointer; }
  a { color: var(--blue); overflow-wrap: anywhere; }
  .by a { white-space: nowrap; }
  :focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  .app { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); }
  .top { background: var(--bar); border-bottom: 1px solid var(--line); }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 6px 12px;
  }
  h1 { font-size: 15px; font-weight: 650; margin: 0; white-space: nowrap; }
  .when { color: var(--muted); font-size: 13px; white-space: nowrap; }
  #q {
    width: 200px;
    min-height: 32px;
    margin-left: auto;
    border: 1px solid #d2d2d7;
    border-radius: 8px;
    padding: 4px 10px;
    background: #fff;
  }
  .sorts, .filters { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
  .filters { padding: 0 8px 6px; }
  .sorts button, .filters button, .back, .textbtn {
    min-height: 32px;
    border: 0;
    background: transparent;
    border-radius: 6px;
    padding: 2px 8px;
    color: var(--muted);
  }
  button[aria-pressed="true"] { background: var(--chip); color: var(--blue); }
  .count { font-variant-numeric: tabular-nums; margin-left: 3px; }
  .status { display: none; }
  .workspace { min-height: 0; display: grid; grid-template-columns: 380px minmax(0, 1fr); }
  .list, .reader { min-height: 0; overflow: auto; background: #fff; }
  .list { border-right: 1px solid var(--line); }
  .row {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: #fff;
    padding: 8px 12px 9px;
    border-radius: 0;
    min-width: 0;
  }
  .row[aria-selected="true"] { background: var(--blue); color: #fff; }
  .who, .sub, .hint { display: flex; justify-content: space-between; gap: 8px; min-width: 0; }
  .who b, .service, .sub, .hint { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who { font-size: 13px; color: var(--muted); }
  .who b { color: var(--ink); font-weight: 600; font-size: 13px; }
  .service { display: block; margin: 1px 0 2px; font-size: 15px; font-weight: 650; line-height: 1.35; }
  .sub { font-size: 13px; line-height: 1.35; }
  .hint { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .row[aria-selected="true"] .who,
  .row[aria-selected="true"] .who b,
  .row[aria-selected="true"] .hint { color: #fff; }
  .reader { background: #fff; }
  .sheet { max-width: 42rem; margin: 0 auto; padding: 28px 40px 80px; }
  .back { display: none; margin: 0 0 12px; border: 1px solid var(--line); background: #fff; color: var(--blue); }
  .by { margin: 0; color: var(--muted); font-size: 15px; }
  .sheet h2 { font-size: 28px; line-height: 1.25; font-weight: 700; margin: 8px 0 8px; letter-spacing: -0.02em; }
  .meta { color: var(--muted); font-size: 13px; margin: 0 0 18px; }
  .brief { margin: 0 0 8px; font-size: 16px; line-height: 1.55; }
  .price { padding: 7px 0; border-top: 1px solid var(--line); font-size: 16px; line-height: 1.45; }
  .price b { font-weight: 600; }
  .note { color: var(--muted); display: block; font-size: 14px; }
  #sec-post { margin-top: 22px; }
  #sec-post h3, details summary {
    font-size: 13px;
    font-weight: 650;
    color: var(--muted);
    margin: 0 0 8px;
  }
  details { border-top: 1px solid var(--line); padding: 10px 0; }
  details summary { cursor: pointer; min-height: 32px; display: flex; align-items: center; }
  details summary:hover { color: var(--ink); }
  .prose, pre {
    margin: 0;
    font: inherit;
    font-size: 17px;
    line-height: 1.75;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid var(--line); }
  .third + .third { margin-top: 16px; }
  .empty { padding: 32px 16px; color: var(--muted); }
  .foot { padding: 12px; color: var(--muted); font-size: 12px; line-height: 1.6; border-top: 1px solid var(--line); }
  .foot a { margin-right: 8px; }
  @media (max-width: 800px) {
    .app { height: auto; display: block; }
    .workspace { display: block; }
    .list, .reader { overflow: visible; }
    .reader { display: none; }
    body.reading .top, body.reading .list { display: none; }
    body.reading .reader { display: block; }
    .back { display: inline-flex; }
    .bar { flex-wrap: wrap; height: auto; }
    #q { width: 100%; margin-left: 0; min-height: 40px; }
    .filters button, .sorts button, .back { min-height: 40px; }
    .sheet { padding: 16px 16px 48px; }
    .sheet h2 { font-size: 24px; }
    .service, .sub, .hint, .who b { white-space: normal; }
  }
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="bar">
      <h1>条款对照</h1>
      <p class="when">2026-11-15 ET</p>
      <div class="sorts" role="group" aria-label="排序">
        <button type="button" data-sort="views" aria-pressed="true">浏览</button>
        <button type="button" data-sort="replies" aria-pressed="false">回复</button>
        <button type="button" data-sort="likes" aria-pressed="false">点赞</button>
      </div>
      <input id="q" type="search" placeholder="搜索" autocomplete="off" enterkeyhint="search" aria-label="搜索 handle、名字或原文">
    </div>
    <div class="filters" role="group" aria-label="筛选" id="filters"></div>
    <p class="status" id="status"></p>
  </header>
  <div class="workspace">
    <div class="list" id="list" role="listbox" aria-label="帖子"></div>
    <article class="reader" id="reader" aria-live="polite"></article>
  </div>
</div>
<script id="data" type="application/json">${payload}</script>
<script>
const data = JSON.parse(document.getElementById("data").textContent);
const posts = data.snapshot.posts;
const briefs = data.briefs;
const FILTERS = [
  ["all", "全部"],
  ["refund_promise", "退款承诺"],
  ["first_login", "仅保首登"],
  ["no_ban", "不保封号"],
  ["page_mismatch", "条款不一致"],
  ["third_party", "买家反馈"]
];
const LABELS = {
  url: "页面", price: "标价", prices: "标价", terms: "现行条款",
  claude_terms: "成品号条款", kyc_refund: "KYC 退款条款",
  price_pro_fangai: "Pro 标价", sister_max_prices: "另一域 Max 标价",
  gap: "本次没核到", inaccessible: "未能读到"
};
const state = { q: "", filters: [], sort: "views", id: null };
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const listEl = document.getElementById("list");
const readerEl = document.getElementById("reader");
const mobileQuery = window.matchMedia("(max-width: 800px)");
let listScroll = 0;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[ch]));
}
function extLabel(href, label) {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return esc(label);
    return '<a href="' + esc(url.href) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + "</a>";
  } catch { return esc(label); }
}
function ext(href) {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return esc(href);
    return '<a href="' + esc(url.href) + '" target="_blank" rel="noopener noreferrer">' + esc(url.href) + "</a>";
  } catch { return esc(href); }
}
function num(n) { return n.toLocaleString("zh-CN"); }
function isMobile() { return mobileQuery.matches; }
function count(key) {
  if (key === "all") return posts.length;
  return posts.filter((post) => post.filters[key].on).length;
}
function visible() {
  const needle = state.q.trim().toLowerCase();
  const metric = { views: "impression_count", replies: "reply_count", likes: "like_count" }[state.sort];
  return posts.filter((post) => {
    if (state.filters.some((key) => !post.filters[key].on)) return false;
    if (!needle) return true;
    const brief = briefs[String(post.n)];
    const landing = post.verification.landing ? Object.values(post.verification.landing).join("\\n") : "";
    const quotes = post.verification.thirdParty.map((item) => item.quote + " " + (item.note || "")).join("\\n");
    const hay = [post.handle, post.name, post.text, post.warrantyNote, post.verification.sellerComment || "", post.verification.narrative, landing, quotes, brief.service].join("\\n").toLowerCase();
    return hay.includes(needle);
  }).sort((a, b) => b.metrics[metric] - a.metrics[metric] || a.n - b.n);
}
function renderFilters() {
  document.getElementById("filters").innerHTML = FILTERS.map(([key, label]) => {
    const on = key === "all" ? state.filters.length === 0 : state.filters.includes(key);
    return '<button type="button" data-filter="' + key + '" aria-pressed="' + on + '">' + label + '<span class="count">' + count(key) + "</span></button>";
  }).join("");
}
function clock(post) {
  const match = String(post.createdAtEt).match(/(\\d{2}:\\d{2})/);
  return match ? match[1] : post.createdAtEt;
}
function renderList(rows) {
  if (!rows.length) {
    listEl.innerHTML = '<p class="empty">没有符合条件的帖子。</p>';
    return;
  }
  listEl.innerHTML = rows.map((post) => {
    const brief = briefs[String(post.n)];
    const on = post.id === state.id;
    return '<button type="button" class="row" role="option" id="row-' + post.id + '" data-id="' + post.id + '" data-n="' + post.n + '" aria-selected="' + on + '" tabindex="' + (on ? "0" : "-1") + '">'
      + '<div class="who"><b>@' + esc(post.handle) + " · " + esc(post.name) + "</b><span>" + esc(clock(post)) + "</span></div>"
      + '<span class="service">' + esc(brief.service) + "</span>"
      + '<div class="sub">' + esc(brief.priceLabel) + " · " + esc(brief.cover) + "</div>"
      + (brief.diff ? '<div class="hint">' + esc(brief.diff) + "</div>" : "")
      + "</button>";
  }).join("");
  const info = document.createElement("div");
  info.className = "foot";
  info.innerHTML = "抓取 " + esc(data.snapshot.meta.digestFetchedAtEt) + "<br>核查 " + esc(data.snapshot.meta.verificationWindowEt) + "<br>"
    + data.snapshot.meta.downloads.map((item) => '<a href="' + esc(item.href) + '" download>' + esc(item.label) + "</a>").join("");
  listEl.appendChild(info);
}
function priceRows(brief) {
  return brief.rows.map((row) => '<div class="price"><b>' + esc(row.src) + " · " + esc(row.name) + "</b><div>" + esc(row.value) + (row.note ? '<span class="note">' + esc(row.note) + "</span>" : "") + "</div></div>").join("");
}
function renderReader(post) {
  if (!post) {
    readerEl.innerHTML = '<div class="sheet"><p class="empty">左边选一条，在这里看原文和核查。</p></div>';
    return;
  }
  const brief = briefs[String(post.n)];
  const comment = post.verification.sellerComment || "核查记录没有另列作者补充。";
  const third = post.verification.thirdParty.length
    ? post.verification.thirdParty.map((item) => '<div class="third"><b>@' + esc(item.handle) + "</b> <span class='kicker'>" + esc(item.createdAtEt || "时间未附") + "</span><blockquote>" + esc(item.quote) + "</blockquote><p class='kicker'>" + esc(item.note || "") + "</p>" + (item.url ? "<p>" + ext(item.url) + "</p>" : "<p class='kicker'>核查记录未附这条发言的链接。</p>") + "</div>").join("")
    : "<p>这条没有摘录第三方发言。没有差评只说明这次没看到，不能当成可靠。</p>";
  const landing = post.verification.landing
    ? Object.entries(post.verification.landing).map(([key, value]) => "<p><span class='kicker'>" + esc(LABELS[key] || key) + "</span><br>" + (/^https?:\\/\\//.test(value) ? ext(value) : esc(value)) + "</p>").join("")
    : "<p>这次没有读到独立商品页。</p>";
  const links = post.expandedLinks.map(ext).concat(post.promo.map(ext));
  readerEl.innerHTML = '<div class="sheet">'
    + '<button type="button" class="back" id="back">返回</button>'
    + '<p class="by">@' + esc(post.handle) + " · " + esc(post.name) + "<br>" + esc(post.createdAtEt) + " · " + extLabel(post.url, "打开原帖") + "</p>"
    + "<h2>" + esc(brief.service) + "</h2>"
    + '<p class="meta">浏览 ' + num(post.metrics.impression_count) + " · 回复 " + num(post.metrics.reply_count) + " · 赞 " + num(post.metrics.like_count) + " · 转发 " + num(post.metrics.repost_count) + " · 引用 " + num(post.metrics.quote_count) + " · 书签 " + num(post.metrics.bookmark_count) + "</p>"
    + '<p class="brief">' + esc(brief.cover) + "。" + esc(brief.diff) + "。</p>"
    + priceRows(brief)
    + '<section id="sec-post"><h3>原文</h3><pre class="prose">' + esc(post.text) + "</pre>" + (links.length ? "<p>" + links.join("<br>") + "</p>" : "") + "</section>"
    + '<details id="sec-seller"><summary>卖家补充</summary><p class="prose">' + esc(comment) + "</p><p class='note'>" + esc(post.verification.sellerPost) + "</p><p class='note'>" + esc(post.warrantyNote) + "</p></details>"
    + '<details id="sec-third"><summary>第三方反馈</summary><p class="note">这些发言没有独立验证成交。没看到差评，只说明这次公开回复里没摘到。</p>' + third + "</details>"
    + '<details id="sec-page"><summary>落地页</summary><p class="note">截至 ' + esc(data.snapshot.meta.pricesAsOfEt) + "。不嵌入对方页面。覆盖：" + esc(post.verification.coverage) + "</p>" + landing + "</details>"
    + '<details id="sec-check"><summary>核查记录</summary><pre class="prose">' + esc(post.verification.narrative) + "</pre><p class='note'>未覆盖：" + esc(post.verification.missing.join("、")) + "</p></details>"
    + "</div>";
}
function paint() {
  const rows = visible();
  if (state.id && !rows.some((post) => post.id === state.id) && !isMobile()) state.id = rows[0] ? rows[0].id : null;
  renderFilters();
  renderList(rows);
  const post = posts.find((item) => item.id === state.id) || null;
  renderReader(post);
  const mode = state.filters.length ? "同时符合 " : "";
  document.getElementById("status").textContent = mode + rows.length + " 条";
  document.querySelectorAll("[data-sort]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.sort === state.sort)));
  document.getElementById("q").value = state.q;
}
function select(id, fromUser) {
  state.id = id;
  if (isMobile() && fromUser) {
    listScroll = window.scrollY;
    history.pushState({ id }, "", "#p=" + id);
    document.body.classList.add("reading");
  }
  paint();
  if (!isMobile()) {
    const row = document.getElementById("row-" + id);
    if (row) row.focus();
    readerEl.scrollTop = 0;
  } else if (fromUser) {
    window.scrollTo(0, 0);
  }
}
function closeReader() {
  document.body.classList.remove("reading");
  paint();
  window.scrollTo(0, listScroll);
  const row = document.getElementById("row-" + state.id);
  if (row) row.focus();
}
document.getElementById("filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  const key = button.dataset.filter;
  if (key === "all") state.filters = [];
  else state.filters = state.filters.includes(key) ? state.filters.filter((item) => item !== key) : state.filters.concat(key);
  paint();
});
document.querySelector(".sorts").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort]");
  if (!button) return;
  state.sort = button.dataset.sort;
  paint();
});
document.getElementById("q").addEventListener("input", (event) => {
  state.q = event.target.value;
  const pos = event.target.selectionStart;
  paint();
  const input = document.getElementById("q");
  input.focus();
  input.setSelectionRange(pos, pos);
});
listEl.addEventListener("click", (event) => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  select(row.dataset.id, true);
});
listEl.addEventListener("keydown", (event) => {
  const rows = [...listEl.querySelectorAll("[data-id]")];
  const index = rows.findIndex((row) => row.dataset.id === state.id);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = rows[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (next) select(next.dataset.id, false);
  } else if (event.key === "Enter" && state.id) {
    select(state.id, true);
  }
});
readerEl.addEventListener("click", (event) => {
  if (event.target.id === "back") {
    if (history.state && history.state.id) history.back();
    else closeReader();
  }
});
window.addEventListener("popstate", () => {
  document.body.classList.remove("reading");
  const y = listScroll;
  paint();
  requestAnimationFrame(() => window.scrollTo(0, y));
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("reading")) {
    if (history.state && history.state.id) history.back();
    else closeReader();
  }
});
paint();
if (!isMobile() && posts[0]) select(posts[0].id, false);
</script>
</body>
</html>
`;

const forbidden = ["/home/", "agent-data", "WebFetch", "/workspace", "cdn.jsdelivr", "fonts.googleapis", "unpkg.com"];
for (const token of forbidden) {
  if (html.includes(token)) throw new Error("forbidden token " + token);
}
const outDir = path.join(root, "web");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html);
console.log("wrote", path.join(outDir, "index.html"), html.length);
