// Build step: count the buyer feedback the maintainer approved (label 「通过」) in the private review repo.
// Writes only numbers per seller; buyer notes, contacts and fingerprints never leave the private repo.
// Usage: node feed/feedback.js <out.json>        (reads FEEDBACK_REPO / FEEDBACK_TOKEN)
//        node feed/feedback.js <out.json> <issues.json>   (offline, for testing)
// Never fails the build: without access it writes an empty file and the pages show no stats.
"use strict";
const fs = require("fs");
const [, , outFile, fromFile] = process.argv;
if (!outFile) { console.error("usage: node feed/feedback.js <out.json> [issues.json]"); process.exit(2); }
const LABEL = "通过";
const KEYS = { outcome: ["ok", "banned", "undelivered"], banAfter: ["lt1d", "1to7d", "1to4w", "gt1m"], handling: ["refunded", "partial", "stalled", "ignored", "none"] };

async function fetchIssues(repo, token) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch("https://api.github.com/repos/" + repo + "/issues?state=all&per_page=100&page=" + page + "&labels=" + encodeURIComponent(LABEL), {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "claude-seller-digest-build" } });
    if (!r.ok) throw new Error("GitHub " + r.status + " " + (await r.text()).slice(0, 200));
    const list = await r.json();
    all.push(...list);
    if (list.length < 100) break;
  }
  return all;
}

function parse(issue) {
  const m = String(issue.body || "").match(/<!--\s*feedback-data\s*([\s\S]*?)-->/);
  if (!m) return null;
  let d; try { d = JSON.parse(m[1]); } catch (e) { return null; }
  if (!d || !/^[a-z0-9_]{1,40}$/.test(d.seller || "") || !KEYS.outcome.includes(d.outcome)) return null;
  return { ...d, day: String(issue.created_at || "").slice(0, 10) };
}

function aggregate(issues) {
  // One count per seller and source fingerprint: repeat submissions from one place keep only the newest.
  const byKey = new Map();
  issues.filter((i) => !i.pull_request && (i.labels || []).some((l) => (l.name || l) === LABEL)).map(parse).filter(Boolean)
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .forEach((d) => byKey.set(d.seller + "|" + (d.fp || Math.random()), d));
  const out = {};
  byKey.forEach((d) => {
    const s = out[d.seller] || (out[d.seller] = { n: 0, outcome: {}, banAfter: {}, handling: {}, last: "" });
    s.n++;
    s.outcome[d.outcome] = (s.outcome[d.outcome] || 0) + 1;
    if (d.outcome === "banned") {
      if (KEYS.banAfter.includes(d.banAfter)) s.banAfter[d.banAfter] = (s.banAfter[d.banAfter] || 0) + 1;
      if (KEYS.handling.includes(d.handling)) s.handling[d.handling] = (s.handling[d.handling] || 0) + 1;
    }
    if (d.day > s.last) s.last = d.day;
  });
  return out;
}

(async () => {
  let issues = [];
  try {
    if (fromFile) issues = JSON.parse(fs.readFileSync(fromFile, "utf8"));
    else if (process.env.FEEDBACK_REPO && process.env.FEEDBACK_TOKEN) issues = await fetchIssues(process.env.FEEDBACK_REPO, process.env.FEEDBACK_TOKEN);
    else console.log("feedback: FEEDBACK_REPO / FEEDBACK_TOKEN not set, no buyer feedback counted");
  } catch (e) {
    console.log("feedback: WARNING could not read the review repo (" + e.message + "), no buyer feedback counted this build");
  }
  const out = aggregate(issues);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + "\n");
  console.log("feedback: " + Object.values(out).reduce((a, s) => a + s.n, 0) + " approved entries for " + Object.keys(out).length + " sellers");
})();
