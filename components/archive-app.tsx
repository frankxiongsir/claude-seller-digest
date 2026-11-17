"use client";

import { useMemo, useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PostCard } from "@/components/post-card";
import { SafeText } from "@/components/safe-text";
import { FILTERS, SORTS, applyArchive } from "@/lib/query";
import type { FilterKey, Snapshot, SortKey } from "@/lib/types";

function countOf(snapshot: Snapshot, key: FilterKey) {
  return snapshot.posts.filter((post) => post.filters[key].on).length;
}

export function ArchiveApp({ snapshot }: { snapshot: Snapshot }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [sort, setSort] = useState<SortKey>("views");

  const visible = useMemo(
    () => applyArchive(snapshot.posts, query, filters, sort),
    [snapshot.posts, query, filters, sort],
  );

  function toggle(key: FilterKey) {
    setFilters((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  const prices = Object.entries(snapshot.meta.sharedItem597.pricesCny);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-sm text-muted-foreground">静态快照 · 不做自动更新</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Claude 公开卖家帖检索
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          2026-11-15 美东全天 20 条公开帖，以及 11 月 16 日夜间的只读评论和落地页核查。页面只对照原文、评论和当时读到的条款，不给卖家打分，也不推荐购买。
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="帖子窗口" value="2026-11-15 00:00–24:00 ET" />
        <Fact label="日报抓取" value={snapshot.meta.digestFetchedAtEt} />
        <Fact label="核查阅读" value="2026-11-16 23:25–23:32 ET" />
        <Fact label="价格截至" value="核查当时的页面" />
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">怎么读这页</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>原帖自述、卖家评论、第三方发言、落地页条款分开放，不混成一句结论。</li>
          <li>第三方发言没有独立验证成交。宣传口径，以及“没看到差评”，都不能当成可靠。</li>
          <li>排序只用抓取时的浏览、回复、点赞，不是质量或风险排名。</li>
          <li>互动数停在日报抓取时点。商品页价格和条款停在核查时点，之后可能已经变了。</li>
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-lg font-semibold">
          总览
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          共 {snapshot.posts.length} 条，与日报条数一致。下面的数字是条款标记出现次数，同一条可以同时落入几类。
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FILTERS.map((item) => (
            <div key={item.key} className="rounded-xl border bg-card px-3 py-3">
              <dt className="text-sm">{item.label}</dt>
              <dd className="mt-1 font-mono text-2xl">{countOf(snapshot, item.key)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          核查优先看的序号是 {snapshot.meta.priorityPosts.join("、")}。这是当时的阅读顺序，不是推荐名单。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">同一套商品文案的标价</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          核查原注：同一商品编号、标题和质保文字，价格不同。只能说明公开货架像是同一模板或上游，不能据此合成一家公司。下表按记录中的店铺列出，不是价格或可靠性排名。标价截至 {snapshot.meta.pricesAsOfEt}。
        </p>
        <p className="mt-3 rounded-xl bg-muted/70 p-3 text-sm leading-7">
          {snapshot.meta.sharedItem597.warrantyQuote}
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">店铺域名</th>
                <th className="px-3 py-2 font-medium">核查时标价（人民币）</th>
              </tr>
            </thead>
            <tbody>
              {prices.map(([host, price]) => (
                <tr key={host} className="border-t">
                  <td className="px-3 py-2 font-mono">{host}</td>
                  <td className="px-3 py-2 font-mono">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">核查重点</h2>
        <div className="mt-3 space-y-3">
          {snapshot.meta.highlights.map((item) => (
            <div key={item.slice(0, 24)} className="rounded-xl border bg-card p-4">
              <SafeText text={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">覆盖限制</h2>
        <div className="mt-3 rounded-xl border bg-card p-4 text-sm leading-7">
          <SafeText text={snapshot.meta.digestIntro} />
          <Separator className="my-4" />
          <ul className="space-y-2">
            {snapshot.meta.coverageBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-muted-foreground">
            时区 {snapshot.meta.timezone}。窗口 {snapshot.meta.windowStartUtc} 至 {snapshot.meta.windowEndUtc}。日报整理时间 {snapshot.meta.digestPreparedAtEt}。核查写完时间 {snapshot.meta.verificationWrittenAtEt}。
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="search-heading">
        <div className="z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:top-0">
          <h2 id="search-heading" className="text-lg font-semibold">
            检索
          </h2>
          <label className="mt-3 block text-sm" htmlFor="archive-query">
            搜索 handle、显示名或原文
          </label>
          <Input
            id="archive-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如 wofuhuola、赵赵，或不保封号"
            className="mt-2 h-11"
            autoComplete="off"
          />
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="条款筛选">
            {FILTERS.map((item) => {
              const pressed = filters.includes(item.key);
              return (
                <Button
                  key={item.key}
                  type="button"
                  variant={pressed ? "default" : "outline"}
                  aria-pressed={pressed}
                  className="min-h-11"
                  onClick={() => toggle(item.key)}
                >
                  {item.label}
                  <Badge variant={pressed ? "secondary" : "outline"}>{countOf(snapshot, item.key)}</Badge>
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            多选时要同时符合。{filters.length === 0 ? "当前未筛选。" : FILTERS.filter((item) => filters.includes(item.key)).map((item) => item.hint).join(" ")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="按原始指标排序">
            <span className="text-sm text-muted-foreground">排序</span>
            {SORTS.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={sort === item.key ? "default" : "outline"}
                aria-pressed={sort === item.key}
                className="min-h-11"
                onClick={() => setSort(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            使用 {snapshot.meta.digestFetchedAtEt} 抓到的原始公开数字。当前显示 {visible.length} / {snapshot.posts.length} 条。
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed px-4 py-10 text-center" data-empty="true">
            <p className="text-base font-medium">没有符合条件的帖子</p>
            <p className="mt-2 text-sm text-muted-foreground">
              换一个词，或清掉筛选。20 条原文都还在，只是当前条件没有命中。
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11"
              onClick={() => {
                setQuery("");
                setFilters([]);
              }}
            >
              清空搜索和筛选
            </Button>
          </div>
        ) : (
          <Accordion multiple className="mt-4 gap-3">
            {visible.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </Accordion>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">下载这份快照</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          下载文件来自附件。核查材料里的内部路径和工具名已去掉，条款、引文、指标和时间没有改写。这不是会自动更新的数据接口。
        </p>
        <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {snapshot.meta.downloads.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                download
                className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm hover:bg-muted"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
