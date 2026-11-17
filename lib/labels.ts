export const LANDING_LABELS: Record<string, string> = {
  url: "页面",
  price: "标价",
  prices: "标价",
  terms: "现行条款",
  claude_terms: "成品号条款",
  kyc_refund: "KYC 退款条款",
  price_pro_fangai: "Pro 标价",
  sister_max_prices: "同站点地图另一域的 Max 标价",
  gap: "本次没核到的部分",
  inaccessible: "未能读到",
};

export function landingLabel(key: string): string {
  return LANDING_LABELS[key] ?? key;
}
