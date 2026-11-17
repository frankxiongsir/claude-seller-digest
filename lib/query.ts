import type { FilterKey, PostRecord, SortKey } from "@/lib/types";

export const FILTERS: { key: FilterKey; label: string; hint: string }[] = [
  {
    key: "refund_promise",
    label: "明确退款承诺",
    hint: "日报点名的退款或换号表述，以及核查记下的卖家评论、落地页退款或退差价。第三方抱怨不计入。",
  },
  {
    key: "first_login",
    label: "仅保首登",
    hint: "原帖、卖家评论或落地页写明只保首次登录。核查列入同一套 /item/597 文案的店铺一并计入。",
  },
  {
    key: "no_ban",
    label: "不保封号",
    hint: "原文或落地页写明不保、不包封号，或写明封号不在质保。未写条款的帖子不放进这一项。",
  },
  {
    key: "missing_info",
    label: "信息缺失",
    hint: "核查记录列出了未写明或未读到的项目。本次 20 条都有至少一项。",
  },
  {
    key: "page_mismatch",
    label: "宣传与商品页不一致",
    hint: "核查写出的原帖或评论，与商品页、落地页现文冲突。同一卖家两条帖互相矛盾另行列出。",
  },
  {
    key: "third_party",
    label: "第三方反馈",
    hint: "核查摘下的非卖家发言。这些发言没有独立验证成交，也不能反过来证明可靠。",
  },
];

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "views", label: "浏览" },
  { key: "replies", label: "回复" },
  { key: "likes", label: "点赞" },
];

const METRIC: Record<SortKey, "impression_count" | "reply_count" | "like_count"> = {
  views: "impression_count",
  replies: "reply_count",
  likes: "like_count",
};

export function applyArchive(
  posts: PostRecord[],
  query: string,
  filters: FilterKey[],
  sort: SortKey,
): PostRecord[] {
  const needle = query.trim().toLowerCase();
  const matched = posts.filter((post) => {
    if (needle) {
      const haystack = [post.handle, post.name, post.text].join("\n").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return filters.every((key) => post.filters[key].on);
  });
  const metric = METRIC[sort];
  return matched.sort(
    (a, b) => b.metrics[metric] - a.metrics[metric] || a.n - b.n,
  );
}
