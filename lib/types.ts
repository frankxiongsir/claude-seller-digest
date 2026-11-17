export type Metrics = {
  impression_count: number;
  reply_count: number;
  like_count: number;
  repost_count: number;
  quote_count: number;
  bookmark_count: number;
};

export type ThirdParty = {
  handle: string;
  url: string | null;
  createdAtEt: string | null;
  quote: string;
  note: string | null;
};

export type FilterKey =
  | "refund_promise"
  | "first_login"
  | "no_ban"
  | "missing_info"
  | "page_mismatch"
  | "third_party";

export type FilterFlag = {
  on: boolean;
  basis: string[];
};

export type PostRecord = {
  n: number;
  id: string;
  url: string;
  handle: string;
  name: string;
  text: string;
  expandedLinks: string[];
  createdAt: string;
  createdAtEt: string;
  metrics: Metrics;
  warrantyClass: string;
  warrantyNote: string;
  promo: string[];
  priority: boolean;
  verification: {
    coverage: string;
    sellerPost: string;
    sellerComment: string | null;
    landing: Record<string, string> | null;
    thirdParty: ThirdParty[];
    pageMismatches: string[];
    otherContradictions: string[];
    missing: string[];
    narrative: string;
  };
  filters: Record<FilterKey, FilterFlag>;
};

export type Snapshot = {
  meta: {
    title: string;
    postDateEt: string;
    windowLabel: string;
    windowStartUtc: string;
    windowEndUtc: string;
    timezone: string;
    digestFetchedAtEt: string;
    digestPreparedAtEt: string;
    verificationWindowEt: string;
    verificationWrittenAtEt: string;
    pricesAsOfEt: string;
    count: number;
    originalSort: string;
    staticSnapshot: boolean;
    priorityPosts: number[];
    digestIntro: string;
    highlights: string[];
    coverageBullets: string[];
    sharedItem597: {
      note: string;
      warrantyQuote: string;
      pricesCny: Record<string, number>;
    };
    downloads: { href: string; label: string }[];
  };
  posts: PostRecord[];
};

export type SortKey = "views" | "replies" | "likes";
