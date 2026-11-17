import type { ReactNode } from "react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/external-link";
import { SafeText } from "@/components/safe-text";
import { FILTERS } from "@/lib/query";
import { landingLabel } from "@/lib/labels";
import type { PostRecord } from "@/lib/types";

function formatCount(value: number) {
  return value.toLocaleString("zh-CN");
}

function Layer({
  source,
  title,
  testId,
  children,
}: {
  source: string;
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-background/70 p-4" data-layer={testId}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{source}</p>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PostCard({ post }: { post: PostRecord }) {
  const active = FILTERS.filter((item) => post.filters[item.key].on);
  const landing = post.verification.landing;

  return (
    <AccordionItem
      value={post.id}
      className="rounded-2xl border bg-card px-4 shadow-sm"
      data-post-id={post.id}
      data-post-n={post.n}
    >
      <AccordionTrigger className="items-start py-4 hover:no-underline">
        <div className="min-w-0 flex-1 pr-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
              {String(post.n).padStart(2, "0")}
            </span>
            <span className="font-semibold">@{post.handle}</span>
            <span className="text-muted-foreground">{post.name}</span>
            {post.priority ? (
              <Badge variant="outline">核查优先序号</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{post.createdAtEt}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-left sm:max-w-md">
            <div>
              <dt className="text-xs text-muted-foreground">浏览</dt>
              <dd className="font-mono text-sm">{formatCount(post.metrics.impression_count)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">回复</dt>
              <dd className="font-mono text-sm">{formatCount(post.metrics.reply_count)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">点赞</dt>
              <dd className="font-mono text-sm">{formatCount(post.metrics.like_count)}</dd>
            </div>
          </dl>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/80">
            {post.warrantyNote}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {active.map((item) => (
              <Badge key={item.key} variant="secondary">
                {item.label}
              </Badge>
            ))}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-5">
        <div className="grid gap-3">
          <Layer source="2026-11-15 日报" title="原帖卖家自述" testId="seller-post">
            <p className="mb-3 text-sm text-muted-foreground">
              {post.createdAtEt}
              <span className="mx-2">·</span>
              <span className="font-mono">{post.createdAt}</span>
            </p>
            <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["浏览", post.metrics.impression_count],
                  ["回复", post.metrics.reply_count],
                  ["点赞", post.metrics.like_count],
                  ["转发", post.metrics.repost_count],
                  ["引用", post.metrics.quote_count],
                  ["书签", post.metrics.bookmark_count],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/60 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-sm">{formatCount(value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mb-2 text-xs text-muted-foreground">抓取正文</p>
            <SafeText text={post.text} />
            <p className="mt-4 text-sm">
              原帖：<ExternalLink href={post.url} />
            </p>
            {post.expandedLinks.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">日报里展开的链接</p>
                <ul className="mt-1 space-y-1">
                  {post.expandedLinks.map((url) => (
                    <li key={url}>
                      <ExternalLink href={url} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              外链在新标签打开。本页不嵌入商家页面。
            </p>
          </Layer>

          <Layer source="2026-11-15 日报" title="条款判别" testId="seller-note">
            <p className="text-sm leading-7">{post.warrantyNote}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              判别标记：{post.warrantyClass}
            </p>
          </Layer>

          <Layer source="2026-11-16 核查" title="卖家评论补充" testId="seller-comment">
            {post.verification.sellerComment ? (
              <p className="text-sm leading-7">{post.verification.sellerComment}</p>
            ) : (
              <p className="text-sm text-muted-foreground">核查记录未单列作者评论补充。</p>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              摘要：{post.verification.sellerPost}
            </p>
          </Layer>

          <Layer source="2026-11-16 核查" title="第三方自述" testId="third-party">
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              第三方发言没有独立验证成交。没有负面评论，只说明这次读到的公开回复里没看到，不能当成可靠。
            </p>
            {post.verification.thirdParty.length === 0 ? (
              <p className="text-sm">本条核查没有摘录第三方发言。</p>
            ) : (
              <ul className="space-y-3">
                {post.verification.thirdParty.map((item) => (
                  <li key={`${item.handle}-${item.quote}`} className="rounded-lg border px-3 py-3">
                    <p className="text-sm font-medium">@{item.handle}</p>
                    {item.createdAtEt ? (
                      <p className="text-xs text-muted-foreground">{item.createdAtEt}</p>
                    ) : null}
                    <blockquote className="mt-2 border-l-2 pl-3 text-sm leading-7">
                      {item.quote}
                    </blockquote>
                    {item.note ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
                    ) : null}
                    {item.url ? (
                      <p className="mt-2 text-sm">
                        <ExternalLink href={item.url} />
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">核查记录未附这条发言的链接。</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Layer>

          <Layer source="2026-11-16 核查" title="落地页现行条款" testId="landing">
            <p className="mb-3 text-xs text-muted-foreground">
              价格与条款截至核查时点，之后可能变化。本页不嵌入这些页面。
            </p>
            {landing ? (
              <dl className="space-y-3">
                {Object.entries(landing).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">{landingLabel(key)}</dt>
                    <dd className="mt-1 text-sm leading-7">
                      {key === "url" || (typeof value === "string" && /^https?:\/\//.test(value)) ? (
                        <ExternalLink href={value} />
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm">本次核查未读到独立商品页。</p>
            )}
            {post.promo.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">核查记录的推广链接</p>
                <ul className="mt-1 space-y-1">
                  {post.promo.map((url) => (
                    <li key={url}>
                      <ExternalLink href={url} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">核查记录没有单列推广链接。</p>
            )}
          </Layer>

          <Layer source="2026-11-16 核查" title="逐条记录与证据原句" testId="narrative">
            <SafeText text={post.verification.narrative} />
            {post.filters.refund_promise.basis.length > 0 ||
            post.filters.first_login.basis.length > 0 ||
            post.filters.no_ban.basis.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">筛选项对应的记录依据</p>
                <ul className="space-y-2">
                  {FILTERS.filter(
                    (item) =>
                      item.key !== "missing_info" &&
                      item.key !== "third_party" &&
                      item.key !== "page_mismatch" &&
                      post.filters[item.key].on,
                  ).map((item) => (
                    <li key={item.key} className="text-sm leading-6">
                      <span className="font-medium">{item.label}：</span>
                      {post.filters[item.key].basis.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Layer>

          <Layer source="2026-11-16 核查" title="矛盾、缺失与覆盖" testId="limits">
            <div className="space-y-3 text-sm leading-7">
              <div>
                <p className="text-xs text-muted-foreground">宣传与商品页不一致</p>
                {post.verification.pageMismatches.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5">
                    {post.verification.pageMismatches.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">本条没有记下这类冲突。</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">其他矛盾</p>
                {post.verification.otherContradictions.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5">
                    {post.verification.otherContradictions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">本条没有记下商品页以外的矛盾。</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">信息缺失</p>
                <ul className="mt-1 list-disc pl-5">
                  {post.verification.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">本条覆盖</p>
                <p className="mt-1">{post.verification.coverage}</p>
              </div>
            </div>
          </Layer>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
