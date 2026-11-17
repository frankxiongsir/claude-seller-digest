import fs from "node:fs";
import path from "node:path";

const uploadDir = process.env.UPLOAD_DIR;
if (!uploadDir) {
  throw new Error("UPLOAD_DIR is required");
}

const root = path.resolve(import.meta.dirname, "..");
const postsRaw = JSON.parse(
  fs.readFileSync(path.join(uploadDir, "digest-posts_3f54.json"), "utf8"),
);
const verificationRaw = JSON.parse(
  fs.readFileSync(path.join(uploadDir, "digest-verification_d4c0.json"), "utf8"),
);
const digestMd = fs.readFileSync(
  path.join(uploadDir, "digest-original_aeb3.md"),
  "utf8",
);
const verificationMd = fs.readFileSync(
  path.join(uploadDir, "digest-verification_ef50.md"),
  "utf8",
);

const FORBIDDEN = [
  "/home/",
  "/workspace",
  "agent-data",
  "WebFetch",
  "daily_digest_2026-11-15_pending",
];

function assertClean(label, text) {
  for (const token of FORBIDDEN) {
    if (text.includes(token)) {
      throw new Error(`${label} still contains internal token: ${token}`);
    }
  }
}

function sectionMap(markdown) {
  const map = new Map();
  const cutoff = markdown.indexOf("\n## 检索覆盖与限制");
  const bounded = cutoff >= 0 ? markdown.slice(0, cutoff) : markdown;
  const re = /^### (\d+)\. @/gm;
  const marks = [];
  let match;
  while ((match = re.exec(bounded))) {
    marks.push({ n: Number(match[1]), index: match.index });
  }
  for (let i = 0; i < marks.length; i += 1) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : bounded.length;
    const chunk = bounded.slice(start, end).trim();
    const body = chunk.replace(/^### \d+\. @[^\n]*\n+/, "").trim();
    map.set(marks[i].n, body);
  }
  return map;
}

function between(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  if (start < 0) throw new Error(`missing heading ${startHeading}`);
  const from = start + startHeading.length;
  const end = endHeading ? markdown.indexOf(endHeading, from) : markdown.length;
  return markdown.slice(from, end < 0 ? markdown.length : end).trim();
}

function urlsFromMarkdown(markdown) {
  const found = new Set();
  const re = /https?:\/\/[^\s)\]]+/g;
  let match;
  while ((match = re.exec(markdown))) {
    found.add(match[0].replace(/[.,，。]+$/, ""));
  }
  return [...found];
}

function landingStrings(landing) {
  if (!landing || typeof landing !== "object") return "";
  return Object.values(landing)
    .filter((value) => typeof value === "string")
    .join("\n");
}

function excerpt(text, pattern) {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && pattern.test(line));
}

const narratives = sectionMap(verificationMd);
const verificationById = new Map(verificationRaw.posts.map((post) => [post.id, post]));
const sharedShops = verificationRaw.shared_item_597_shops;
const item597Shops = new Set(Object.keys(sharedShops.prices_cny));

function usesSharedItem(verification) {
  const urls = [
    ...(verification.promo || []),
    verification.landing?.url || "",
  ];
  return urls.some((url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return item597Shops.has(host) && url.includes("/item/597");
    } catch {
      return false;
    }
  });
}

const REFUND_NUMBERS = new Set([3, 4, 6, 7, 13, 18]);
const FIRST_LOGIN_RE = /仅保首登|只保首登|只保首次|只质保首次|质保首登|质保首次登录|首次登录不上/;
const NO_BAN_RE = /不保封号|不包封号|不质保封号|封号不在质保|封号不保|不是封号质保|无任何售后|不售后|不做退款|怕封的用户/;
const PAGE_MISMATCH_RE = /商品页|落地页|详情|sister|卡网|宣传/;

const posts = postsRaw.posts.map((post, index) => {
  const verification = verificationById.get(post.id);
  if (!verification) throw new Error(`missing verification for ${post.id}`);
  if (verification.n !== index + 1) {
    throw new Error(`order mismatch for ${post.id}`);
  }
  const narrative = narratives.get(verification.n);
  if (!narrative) throw new Error(`missing narrative for ${verification.n}`);

  const sellerLayer = [
    post.warranty_note,
    verification.seller_post,
    verification.seller_comment || "",
    landingStrings(verification.landing),
  ].join("\n");

  const refundBasis = [];
  if ([3, 6, 7, 18].includes(verification.n)) {
    refundBasis.push(
      `日报列入「明确写封号/失败退款或质保期内不能使用则退款换号」。条款判别：${post.warranty_note}`,
    );
  }
  if (verification.n === 4) {
    refundBasis.push(`核查记录的矛盾：${verification.conflicts.join("；")}`);
    if (verification.landing?.kyc_refund) {
      refundBasis.push(`落地页：${verification.landing.kyc_refund}`);
    }
    if (verification.seller_comment) {
      refundBasis.push(`卖家评论补充：${verification.seller_comment}`);
    }
  }
  if (verification.n === 13 && verification.landing?.terms) {
    refundBasis.push(`落地页现行条款：${verification.landing.terms}`);
  }

  const firstLoginBasis = excerpt(sellerLayer, FIRST_LOGIN_RE);
  const noBanBasis = excerpt(sellerLayer, NO_BAN_RE);
  const shared = usesSharedItem(verification);
  if (shared) {
    const sharedBasis = `核查记录将本店列入同一套 /item/597 文案。质保原句：${sharedShops.warranty_quote}`;
    if (!firstLoginBasis.includes(sharedBasis)) firstLoginBasis.push(sharedBasis);
    if (!noBanBasis.some((line) => line.includes("同一套 /item/597"))) {
      noBanBasis.push(sharedBasis);
    }
  }

  const pageMismatches = (verification.conflicts || []).filter((item) =>
    PAGE_MISMATCH_RE.test(item),
  );
  const otherContradictions = (verification.conflicts || []).filter(
    (item) => !PAGE_MISMATCH_RE.test(item),
  );

  const thirdParty = (verification.third_party || []).map((item) => ({
    handle: item.handle,
    url: item.url || null,
    createdAtEt: item.created_at_et || null,
    quote: item.quote,
    note: item.note || null,
  }));

  return {
    n: verification.n,
    id: post.id,
    url: post.url,
    handle: post.handle,
    name: post.name,
    text: post.text,
    expandedLinks: urlsFromMarkdown(post.text_markdown).filter(
      (url) => !url.includes(`/status/${post.id}`),
    ),
    createdAt: post.created_at,
    createdAtEt: post.created_at_et,
    metrics: post.metrics,
    warrantyClass: post.warranty_class,
    warrantyNote: post.warranty_note,
    promo: verification.promo || [],
    priority: verificationRaw.priority_posts.includes(verification.n),
    verification: {
      coverage: verification.coverage,
      sellerPost: verification.seller_post,
      sellerComment: verification.seller_comment,
      landing: verification.landing,
      thirdParty,
      pageMismatches,
      otherContradictions,
      missing: verification.missing || [],
      narrative,
    },
    filters: {
      refund_promise: {
        on: REFUND_NUMBERS.has(verification.n),
        basis: refundBasis,
      },
      first_login: { on: firstLoginBasis.length > 0, basis: firstLoginBasis },
      no_ban: { on: noBanBasis.length > 0, basis: noBanBasis },
      missing_info: {
        on: (verification.missing || []).length > 0,
        basis: verification.missing || [],
      },
      page_mismatch: { on: pageMismatches.length > 0, basis: pageMismatches },
      third_party: {
        on: thirdParty.length > 0,
        basis: thirdParty.map((item) => `@${item.handle}：${item.quote}`),
      },
    },
  };
});

if (posts.length !== 20) throw new Error(`expected 20 posts, got ${posts.length}`);

const highlights = between(verificationMd, "## 重点发现", "## 逐条简明结论")
  .split(/\n(?=\d+\. )/)
  .map((item) => item.trim())
  .filter(Boolean);

const coverageBullets = between(verificationMd, "## 检索覆盖与限制", "完整补查文件")
  .split("\n")
  .map((line) => line.replace(/^- /, "").trim())
  .filter((line) => line && !line.startsWith("/"));

const digestIntro = digestMd
  .split(/^## 1\./m)[0]
  .replace(/^状态：.*\n/m, "")
  .replace(/^# .*\n+/, "")
  .trim();

const snapshot = {
  meta: {
    title: "Claude 公开卖家帖检索",
    postDateEt: postsRaw.post_date_et,
    windowLabel: postsRaw.window.label,
    windowStartUtc: postsRaw.window.start_utc,
    windowEndUtc: postsRaw.window.end_utc,
    timezone: postsRaw.window.timezone,
    digestFetchedAtEt: postsRaw.fetched_at_et,
    digestPreparedAtEt: postsRaw.delivered_at_et,
    verificationWindowEt: verificationRaw.fetched_at_et,
    verificationWrittenAtEt: verificationRaw.written_at_et,
    pricesAsOfEt: verificationRaw.fetched_at_et,
    count: 20,
    originalSort: postsRaw.sort,
    staticSnapshot: true,
    priorityPosts: verificationRaw.priority_posts,
    digestIntro,
    highlights,
    coverageBullets,
    sharedItem597: {
      note: sharedShops.note,
      warrantyQuote: sharedShops.warranty_quote,
      pricesCny: sharedShops.prices_cny,
    },
    downloads: [
      {
        href: "/downloads/2026-11-15-posts.json",
        label: "日报原始帖 JSON",
      },
      {
        href: "/downloads/2026-11-15-digest.md",
        label: "日报 Markdown",
      },
      {
        href: "/downloads/2026-11-16-verification.json",
        label: "核查 JSON",
      },
      {
        href: "/downloads/2026-11-16-verification.md",
        label: "核查 Markdown",
      },
    ],
  },
  posts,
};

const publicPosts = {
  post_date_et: postsRaw.post_date_et,
  window: postsRaw.window,
  count: postsRaw.count,
  sort: postsRaw.sort,
  fetched_at_et: postsRaw.fetched_at_et,
  prepared_at_et: postsRaw.delivered_at_et,
  posts: postsRaw.posts.map((post) => {
    const copy = { ...post };
    delete copy.source;
    return copy;
  }),
};

const publicVerification = {
  topic: verificationRaw.topic,
  fetched_at_et: verificationRaw.fetched_at_et,
  written_at_et: verificationRaw.written_at_et,
  method:
    "Public X conversation_id search and public catalog GET; no contact, login, or orders",
  priority_posts: verificationRaw.priority_posts,
  shared_item_597_shops: verificationRaw.shared_item_597_shops,
  posts: verificationRaw.posts,
};

let publicDigest = digestMd.replace(/^状态：.*\n/m, "");
publicDigest = publicDigest.replace(
  "交付状态：delivered；实际交付时间（美东）：",
  "整理时间（美东）：",
);
publicDigest =
  "公开副本：已去掉内部流程状态字样。条款、原文、指标与时间未改。\n\n" +
  publicDigest;

let publicVerificationMd = verificationMd.replace(
  "对象：已交付日报 `/archive/2026-11-15/` 的 20 条（posts.json / digest.md）。原日报、指标和推荐记录未改。",
  "对象：2026-11-15 日报的 20 条。原日报与互动指标未改。",
);
publicVerificationMd = publicVerificationMd.replace(
  "WebFetch / 公开商品列表接口读取",
  "公开网页读取",
);
publicVerificationMd = publicVerificationMd.replace(/\n完整补查文件：[\s\S]*$/, "\n");
publicVerificationMd =
  "公开副本：已去掉内部路径和工具名。引文、条款与覆盖限制未改。\n\n" +
  publicVerificationMd;

const downloadDir = path.join(root, "public", "downloads");
fs.mkdirSync(downloadDir, { recursive: true });
fs.mkdirSync(path.join(root, "data"), { recursive: true });

const files = {
  [path.join(root, "data", "snapshot.json")]: JSON.stringify(snapshot, null, 2),
  [path.join(downloadDir, "2026-11-15-posts.json")]: JSON.stringify(publicPosts, null, 2),
  [path.join(downloadDir, "2026-11-16-verification.json")]: JSON.stringify(
    publicVerification,
    null,
    2,
  ),
  [path.join(downloadDir, "2026-11-15-digest.md")]: publicDigest,
  [path.join(downloadDir, "2026-11-16-verification.md")]: publicVerificationMd,
};

for (const [file, text] of Object.entries(files)) {
  assertClean(file, text);
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
}

const summary = posts.map((post) => ({
  n: post.n,
  handle: post.handle,
  refund: post.filters.refund_promise.on,
  first: post.filters.first_login.on,
  noBan: post.filters.no_ban.on,
  missing: post.filters.missing_info.on,
  mismatch: post.filters.page_mismatch.on,
  third: post.filters.third_party.on,
}));
console.log(JSON.stringify(summary, null, 2));
