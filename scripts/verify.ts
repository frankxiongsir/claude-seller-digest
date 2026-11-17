import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { applyArchive } from "../lib/query.ts";
import type { FilterKey, Snapshot } from "../lib/types.ts";
import snapshotJson from "../data/snapshot.json" with { type: "json" };

const snapshot = snapshotJson as Snapshot;
const root = path.resolve(import.meta.dirname, "..");

const forbidden = [
  "/home/",
  "/workspace",
  "agent-data",
  "WebFetch",
  "daily_digest_2026-11-15_pending",
];

function readPublic() {
  const files = [
    "data/snapshot.json",
    "public/downloads/2026-11-15-posts.json",
    "public/downloads/2026-11-15-digest.md",
    "public/downloads/2026-11-16-verification.json",
    "public/downloads/2026-11-16-verification.md",
  ];
  return files.map((file) => ({ file, text: fs.readFileSync(path.join(root, file), "utf8") }));
}

const ids = snapshot.posts.map((post) => post.id);
assert.equal(snapshot.posts.length, 20);
assert.equal(new Set(ids).size, 20);
assert.deepEqual(
  snapshot.posts.map((post) => post.n),
  Array.from({ length: 20 }, (_, index) => index + 1),
);

for (const post of snapshot.posts) {
  assert.ok(post.text.length > 20, `empty text ${post.n}`);
  assert.ok(post.url.startsWith("https://x.com/"));
  assert.ok(post.createdAtEt.includes("ET"));
  assert.equal(typeof post.metrics.impression_count, "number");
  assert.notEqual(post.text, post.verification.narrative);
  assert.ok(post.warrantyNote.length > 0);
  assert.ok(Array.isArray(post.verification.missing));
  assert.ok(post.verification.sellerPost.length > 0);
  assert.equal(post.filters.missing_info.on, post.verification.missing.length > 0);
}

const byViews = applyArchive(snapshot.posts, "", [], "views").map((post) => post.n);
assert.deepEqual(byViews, snapshot.posts.map((post) => post.n));

const byLikes = applyArchive(snapshot.posts, "", [], "likes").map((post) => post.n);
assert.notDeepEqual(byLikes, byViews);
assert.equal(byLikes[0], 1);

const byReplies = applyArchive(snapshot.posts, "", [], "replies").map((post) => post.id);
assert.equal(byReplies[0], "2122192191699509694");

function numbers(filters: FilterKey[]) {
  return applyArchive(snapshot.posts, "", filters, "views").map((post) => post.n);
}

assert.deepEqual(numbers(["refund_promise"]), [3, 4, 6, 7, 13, 18]);
assert.deepEqual(numbers(["first_login"]), [2, 5, 8, 9, 11, 12, 14, 15, 17, 20]);
assert.deepEqual(numbers(["no_ban"]), [2, 4, 5, 8, 9, 11, 12, 13, 14, 15, 17, 20]);
assert.deepEqual(numbers(["missing_info"]).length, 20);
assert.deepEqual(numbers(["page_mismatch"]), [4, 5, 8, 11, 13, 20]);
assert.deepEqual(numbers(["third_party"]), [2, 4, 5, 6, 7, 9, 17]);
assert.deepEqual(numbers(["refund_promise", "third_party"]), [4, 6, 7]);
assert.ok(!numbers(["page_mismatch"]).includes(3));
assert.ok(!numbers(["page_mismatch"]).includes(6));

const one = applyArchive(snapshot.posts, "wofuhuola", [], "views");
assert.equal(one.length, 1);
assert.equal(one[0].handle, "wofuhuola");
assert.equal(applyArchive(snapshot.posts, "这段原文不存在xyz", [], "views").length, 0);

const post5 = snapshot.posts.find((post) => post.n === 5);
assert.ok(post5);
assert.match(post5.text, /不保封号/);
assert.equal(post5.verification.landing?.url, "https://zzaibox.cn/item/597");
assert.ok(post5.verification.thirdParty.some((item) => item.quote.includes("卡网免k号")));
assert.notEqual(post5.text, post5.verification.sellerComment);

for (const { file, text } of readPublic()) {
  for (const token of forbidden) {
    assert.equal(text.includes(token), false, `${file} contains ${token}`);
  }
}

const postsDownload = JSON.parse(
  fs.readFileSync(path.join(root, "public/downloads/2026-11-15-posts.json"), "utf8"),
);
assert.equal(postsDownload.posts.length, 20);
assert.equal(postsDownload.posts.some((post: { source?: string }) => "source" in post), false);

console.log("verify ok: 20 posts, filters, sort, separation, no internal tokens");
