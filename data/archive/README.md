# 按美东日期归档

目录名是 America/New_York 的日历日。这里只放已经公开的帖子和核查材料。不放凭据、账号配置或内部路径。

| 日期 | 内容 | 文件 |
| --- | --- | --- |
| 2026-11-12 | 16 条公开卖家帖。互动数是 2026-11-17 07:20–07:32 ET 的公开指标，不是发帖当日历史值。只读核查已知开始 2026-11-17 07:37:59 EST，工具记录 07:38–07:41 ET，精确结束未记录；07:46 是首次落盘时间，不是核查结束。 | `2026-11-12/posts.json`、`digest.md`、`metadata.json`、`verification.json`、`verification.md` |
| 2026-11-13 | 15 条。互动数同样是 2026-11-17 07:20–07:32 ET 的公开指标，不是发帖当日历史值。核查时间同 11-12。窗口内一条因判定为 API 中转而未收录，未另凑。 | `2026-11-13/posts.json`、`digest.md`、`metadata.json`、`verification.json`、`verification.md` |
| 2026-11-14 | 17 条。帖子与互动数复用 2026-11-15 21:47 ET 已交付档案，不是 2026-11-17 新抓取。只读核查于 2026-11-17 补做，开始与工具时间同 11-12，精确结束未记录。 | `2026-11-14/posts.json`、`digest.md`、`metadata.json`、`verification.json`、`verification.md` |
| 2026-11-15 | 当天 20 条公开卖家帖。抓取时间 2026-11-16 09:35 ET。 | `2026-11-15/posts.json`、`2026-11-15/digest.md` |
| 2026-11-16 | 含两部分，须并存、互不覆盖：（1）2026-11-16 ET 当日 20 条卖家帖日报与只读核查，抓取 2026-11-17 09:13–09:17 ET，核查 09:22–09:28 ET，见 `digest.md`、`posts.json`、`metadata.json`、`day.json`、`digest-verification.json`、`digest-verification.md`；（2）此前发布的对 2026-11-15 日报的核查，阅读窗口 2026-11-16 23:25–23:32 ET，仍为原文件 `verification.json`、`verification.md`，不要覆盖。 | 见左列 |
| 2026-11-17 | 当天 20 条公开卖家帖与只读核查。排序和正文互动数是 2026-11-18 09:14:53–09:22:25 ET 的检索指标。评论早上 09:26:27–09:34:03 ET，晚间补查 20:43–20:47 ET；落地页 09:39–09:52 ET。晚间 20:43 ET 的互动数只作 version，不覆盖排序数字。公开状态 archived，全文逐条交付尚未确认完成，不标 delivered。 | `2026-11-17/posts.json`、`digest.md`、`metadata.json`、`day.json`、`digest-verification.json`、`digest-verification.md`；同内容另有 `verification.json`、`verification.md` |
| 2026-11-18 | 当天 20 条公开卖家帖与只读核查。排序和正文互动数是 2026-11-19 09:16:06–09:19:35 ET 的检索指标。评论 09:24:52–09:26:14 ET；落地页 09:26–09:27 ET（只读抓取）与约 09:28–09:42 ET（浏览器只读）。公开状态 delivered。 | `2026-11-18/posts.json`、`digest.md`、`metadata.json`、`day.json`、`digest-verification.json`、`digest-verification.md` |
| 2026-11-19 | 当天 20 条公开卖家帖与只读核查。排序和正文互动数是 2026-11-20 09:13–09:16 ET 的检索指标。评论 09:24–09:29 ET；落地页 09:26–09:28 ET（只读抓取）与 09:30:44–09:39:10 ET（浏览器只读）。公开状态 archived，全文尚未确认全部发送，不标 delivered。 | `2026-11-19/posts.json`、`digest.md`、`metadata.json`、`day.json`、`digest-verification.json`、`digest-verification.md` |

2026-11-15 的正文以及 2026-11-16 对 11-15 的核查仍在 `public/downloads/`（`2026-11-15-digest.md`、`2026-11-15-posts.json`、`2026-11-16-verification.json`、`2026-11-16-verification.md`）。2026-11-16 当日日报的下载文件使用不冲突的文件名：`2026-11-16-digest.md`、`2026-11-16-posts.json`、`2026-11-16-day.json`，不要覆盖已有的 `2026-11-16-verification.*`。2026-11-17 的下载文件是 `2026-11-17-digest.md`、`2026-11-17-posts.json`、`2026-11-17-day.json`，不替换更早日期的核查文件。2026-11-18 的下载文件是 `2026-11-18-digest.md`、`2026-11-18-posts.json`、`2026-11-18-day.json`，不要覆盖其他日期文件。2026-11-19 的下载文件是 `2026-11-19-digest.md`、`2026-11-19-posts.json`、`2026-11-19-day.json`，不要覆盖其他日期文件。`data/snapshot.json` 仍是既有页面快照，除非另有构建步骤，不在本次日报中改写。

补档说明和清单在 `backfill/2026-11-12-14/README.md`、`backfill/2026-11-12-14/manifest.json`，不放在仓库根目录。

以后按日追加时，新建 `data/archive/YYYY-MM-DD/`，放当天的公开帖或核查文件，并在上表补一行。价格、条款和互动数停在各文件写明的时点。第三方发言没有独立验证成交。
