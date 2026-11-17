# Claude 公开卖家帖检索

2026-11-15 美东全天 20 条公开卖家帖，以及 2026-11-16 23:25–23:32 ET 的只读评论与落地页核查。这是一份静态快照，用来对照原文、卖家评论、第三方发言和当时读到的商品页条款。

页面不推荐购买，不给卖家做可靠性排名，也不嵌入商家页面。第三方发言没有独立验证成交。

## 本地运行

```bash
npm install
npm run dev
```

审阅版阅读页是 `web/index.html`，可直接双击。同目录下放 `downloads/` 后，页内下载链接可用。`npm run dev` 仍是早先的长页面，不是这次的审阅版。

```bash
npm run verify
npm run lint
npm run build
```

`npm run build` 会生成静态目录 `out/`。

## 数据

按美东日历日归档在 `data/archive/`。索引见 `data/archive/README.md`。

- `data/archive/2026-11-15/`：20 条公开帖，抓取时间 2026-11-16 09:35 ET。
- `data/archive/2026-11-16/`：评论与落地页核查，阅读窗口 23:25–23:32 ET。

`public/downloads/` 是同一份文件，给 `web/index.html` 下载。`data/snapshot.json` 是页面快照。条款、引文、互动数字和时间没有改写。重新从原始附件生成时，设置 `UPLOAD_DIR` 后运行 `npm run prepare-data`。

价格和条款停在核查当时。浏览、回复、点赞停在日报抓取时间。页面不会自动更新。以后按日只追加新的 `data/archive/YYYY-MM-DD/`，不把凭据写进仓库。
