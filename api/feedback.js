// Buyer feedback: POST /api/feedback (from /feedback/) opens an issue in a PRIVATE review repo.
// Nothing a buyer writes is published; the build only counts issues the maintainer labels 「通过」
// (feed/feedback.js), and the seller page shows those counts.
// Vercel environment variables:
//   FEEDBACK_REPO   owner/name of the private review repo, e.g. frankxiongsir/claude-seller-feedback
//   FEEDBACK_TOKEN  fine-grained token limited to that repo: Issues read & write (Metadata read is implied)
"use strict";
const crypto = require("crypto");

const PRODUCT = { pro: "Pro 成品号", max5: "Max 5x", max20: "Max 20x / Ultra", kyc: "KYC 验证", topup: "直充 / 代充", other: "其他" };
const OUTCOME = { ok: "正常在用", banned: "被封了", undelivered: "没交付 / 联系不上" };
const BAN_AFTER = { lt1d: "不到 1 天", "1to7d": "1–7 天", "1to4w": "1–4 周", gt1m: "1 个月以上" };
const HANDLING = { refunded: "赔了或换了号", partial: "只赔了一部分", stalled: "拖着没处理", ignored: "不理我", none: "我没找卖家" };

// Per-instance limit: a warm function remembers recent senders. Cheap, not bulletproof; review is the real gate.
const LIMIT = 4, WINDOW_MS = 60 * 60 * 1000;
const recent = new Map();
function limited(fp) {
  const now = Date.now(), list = (recent.get(fp) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) { recent.set(fp, list); return true; }
  list.push(now); recent.set(fp, list);
  if (recent.size > 5000) recent.clear();
  return false;
}

const clip = (v, n) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim().slice(0, n);
// User text goes inside fences / inline code so it cannot @mention people, add links or break the layout.
const inline = (s) => "`" + s.replace(/[`\n]/g, " ") + "`";
const fence = (s) => "````text\n" + s.replace(/````/g, "'''") + "\n````";

function check(b) {
  if (!b || typeof b !== "object") return "bad request";
  if (!/^[a-z0-9_]{1,40}$/.test(b.seller || "")) return "请选择卖家";
  if (!PRODUCT[b.product]) return "请选择买的什么";
  if (!OUTCOME[b.outcome]) return "请选择现在怎么样了";
  if (b.outcome === "banned" && !BAN_AFTER[b.banAfter]) return "请选择用了多久被封";
  if (b.outcome === "banned" && !HANDLING[b.handling]) return "请选择卖家怎么处理";
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(b.month || "")) return "请选择购买时间";
  if (b.paid !== "" && b.paid != null && !(Number(b.paid) >= 0 && Number(b.paid) <= 100000)) return "金额不对";
  if (b.agree !== true) return "请勾选确认";
  return "";
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const send = (code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); };
  if (req.method !== "POST") return send(405, { error: "POST only" });
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = req.headers.origin || "";
  if (origin && origin.replace(/^https?:\/\//, "") !== host) return send(403, { error: "forbidden" });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  // Honeypot and "filled in under 3 seconds": pretend success so bots learn nothing.
  if (b && (b.website || (Number(b.elapsed) > 0 && Number(b.elapsed) < 3000))) return send(200, { ok: true });
  const err = check(b);
  if (err) return send(400, { error: err });

  const repo = process.env.FEEDBACK_REPO, token = process.env.FEEDBACK_TOKEN;
  if (!repo || !token) return send(503, { error: "反馈功能还没开通" });

  const ip = String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "").split(",")[0].trim();
  // A salted hash, never the address: equal for repeat submissions from one place, useless outside this repo.
  const fp = crypto.createHash("sha256").update(token.slice(-16) + "|" + ip).digest("hex").slice(0, 10);
  if (limited(fp)) return send(429, { error: "提交太频繁了，请过一会儿再试" });

  const sellerName = clip(b.sellerName, 80) || b.seller;
  const paid = b.paid === "" || b.paid == null ? null : Math.round(Number(b.paid) * 100) / 100;
  const note = clip(b.note, 1000), contact = clip(b.contact, 120);
  const data = { v: 1, seller: b.seller, product: b.product, paid, month: b.month, outcome: b.outcome,
    banAfter: b.outcome === "banned" ? b.banAfter : null, handling: b.outcome === "banned" ? b.handling : null, fp };
  const site = "https://" + host;
  const result = OUTCOME[b.outcome] + (b.outcome === "banned" ? " · 用了 " + BAN_AFTER[b.banAfter] + " · 卖家：" + HANDLING[b.handling] : "");
  const body = [
    "**卖家**：" + inline(sellerName) + " · [卖家页](" + site + "/s/" + b.seller + "/)",
    "**买的**：" + PRODUCT[b.product] + (paid != null ? " · ¥" + paid : "") + " · " + b.month + " 买的",
    "**结果**：" + result,
    "",
    "**补充说明**",
    note ? fence(note) : "（没写）",
    "",
    "**联系方式**：" + (contact ? inline(contact) : "（没留）"),
    "",
    "---",
    "审核：可信就加「通过」标签，下一次网站构建时计入统计（只计数字）。不可信直接关闭。",
    "需要更正选项，改下面这段 JSON 就行。",
    "来源指纹 `" + fp + "`：同一来源多次提交时相同，不是 IP 地址。",
    "",
    "<!-- feedback-data",
    JSON.stringify(data),
    "-->",
  ].join("\n");

  try {
    const r = await fetch("https://api.github.com/repos/" + repo + "/issues", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "claude-seller-digest-feedback" },
      body: JSON.stringify({ title: "反馈：" + sellerName.replace(/\n/g, " ") + " · " + OUTCOME[b.outcome], body }),
    });
    if (!r.ok) { console.error("github", r.status, (await r.text()).slice(0, 300)); return send(502, { error: "暂时没存上，请稍后再试" }); }
    return send(200, { ok: true });
  } catch (e) {
    console.error("github", e && e.message);
    return send(502, { error: "暂时没存上，请稍后再试" });
  }
};
