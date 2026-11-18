# Claude 卖家帖每日信息流

在线阅读：**https://claude-seller-digest.vercel.app/**

每天收集 X 上公开出售 Claude 账号、成品号、代充和 KYC 验证服务的帖子（每天 20 条，按美东日历日、按浏览量取），逐条对照原帖、作者评论、商品页条款和评论区里的第三方发言，整理成一个可以像 RSS 阅读器一样浏览的信息流。

## 为什么做这个

国内买 Claude 的渠道很多，但卖家帖里的说法常常和商品页对不上：原帖写「过 KYC」，商品页写「没过 KYC」；原帖写「包售后」，商品页只保首次登录；价格在原帖、商品页、另一个域名上各不相同。想买的人很难一条条去翻。

这个项目想做的是**把公开信息摆在一起，让人自己判断**：

- 每个商家：卖什么、多少钱、条款原话、说法哪里前后矛盾、评论区有没有人自述被封或退款无门，并附上出处链接。
- **价格排名**：按 Pro / Max 5x / Max 20x / KYC / Teams 分档，同一商家只取当天最低价，人民币和美元分开比较。
- **风险评分**：只按固定规则数「红旗」（说法矛盾、负面自述、只保首登或不保封号、没写条款、商品页打不开、有退款说法但没证据），满分 100，分越高越要小心。

## 这个项目不做什么

- **不推荐购买**，不替任何卖家背书。风险分低只代表红旗少，不代表可靠。
- 不联系卖家、不下单、不登录，只读公开页面。
- 条款、价格、引文按原话记录，不改写；评论区发言是当事人自述，未经独立证实。
- 价格和条款停在当天核查的时间点，之后可能已经变化。

## 数据怎么来、怎么更新

1. 每天由一个 Grok 机器人抓取前一天的公开卖家帖，并做只读核查。
2. 结果按美东日期提交到 `data/archive/YYYY-MM-DD/`：
   - `posts.json`：当天 20 条帖子原文与互动数据；
   - `verification.json`：评论区与商品页核查；
   - `day.json`（可选）：整理好的单日数据，格式见 `feed/GROK_PROMPT.md`，有它时优先使用。
3. 每次推送到 `main`，Vercel 运行 `feed/vercel-build.sh` 重新生成页面并发布。某天的文件格式有误时构建会失败，线上保留上一版。

自动从 `posts.json` / `verification.json` 转换的日期，价格和条款开关按规则提取、未经人工复核，页面简报里会注明。

## 本地预览

只需要 Python 3.10+，不用装依赖：

```bash
sh feed/vercel-build.sh
open dist/index.html   # Linux 用 xdg-open
```

`npm run dev` 是早先的 Next.js 长页面版本，保留在仓库里，不是线上版本。

## 更正与下架

页面点名了具体卖家，写错了就应该改。完整规则见页面侧栏的 **「更正与下架」**（[直达链接](https://claude-seller-digest.vercel.app/#v=latest&i=page%3Acorrections)）。

- **怎么报错**：在本仓库用 [更正表单](https://github.com/frankxiongsir/claude-seller-digest/issues/new?template=correction.yml) 提 Issue；不方便公开的情况（比如卖家本人申请下架）在 X 私信 [@xudongsheng1945](https://x.com/xudongsheng1945)。
- **多久处理**：3 个工作日内回复，确认有误后在下一次页面更新时生效。
- **什么情况会改**：
  - 事实写错（价格、归类、条款引文、链接）→ 更正，帖子标「已更正」并写明原因；
  - 原帖已删除、账号注销或设为私密 → 下架，页面和下载文件里都不再出现；
  - 条款后来变了 → 旧日期是当天快照，不改，可加补充说明；
  - 不同意风险分 → 分数按固定规则计算，不单独调分；依据的事实有误时按事实错误处理；
  - 不接受付费删帖、改分、置顶或推荐。

所有改动都公开记录在页面的「更正记录」里。

### 维护者：怎么处理一条更正

所有更正都写在 `feed/corrections.json`，每次构建时生效，不改 `data/archive/` 里的原始文件。三种条目：

```jsonc
{
 "prices": [   // 改一行价格的归类或备注
  {"date": "2026-11-13", "post_id": "2121385998374539766", "product_contains": "Claude Pro", "amount": 135,
   "set": {"category": "other", "note": "官方代充，不计入成品号排名"},
   "reason": "页面上显示的原因", "added": "2026-11-17"}
 ],
 "notes": [    // 在某条帖子上加补充说明（比如条款后来更新了）
  {"date": "2026-11-16", "post_id": "…", "text": "卖家 11-20 起改为只保首登，见 https://…", "reason": "Issue #12", "added": "2026-11-20"}
 ],
 "removals": [ // 下架：按单条帖子，或按账号下架其全部帖子
  {"date": "2026-11-15", "post_id": "…", "reason": "原帖已删除", "added": "2026-11-18"},
  {"handle": "someone", "reason": "账号已注销", "added": "2026-11-18"}
 ]
}
```

- `post_id` 是 X 帖子编号（帖子链接最后那串数字），`date` 是它所在的那一期。
- 每条都必须对得上数据：价格条目要恰好匹配一行价格，下架条目至少匹配一条帖子。对不上时构建失败，线上保留上一版，这样过期的更正不会悄悄失效。
- 下架时，构建会把这条帖子从页面、`archive/` 和 `downloads/` 里的 JSON 文件中去掉，并移除提到它的 Markdown 下载文件。仓库的 Git 历史里仍有旧版本；如果必须彻底清除，需要另外改写历史。
- 处理完在 Issue 里回复，并关闭 Issue。

## 联系我

发现信息有误、条款已更新，或者想补充某个卖家的公开信息，欢迎联系，也可以直接在本仓库提 Issue（见上面的「更正与下架」）。

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <b>X（Twitter）</b><br><br>
      <a href="https://x.com/xudongsheng1945"><img src="docs/x-card.svg" alt="X @xudongsheng1945" width="300"></a><br><br>
      <a href="https://x.com/xudongsheng1945">x.com/xudongsheng1945</a>
    </td>
    <td align="center" valign="top" width="50%">
      <b>微信交流群</b><br><br>
      <img src="docs/wechat-group.png" alt="微信交流群二维码" width="220"><br>
      <sub>微信扫码入群。群二维码每 7 天失效，过期请在 X 上私信获取新码。</sub>
    </td>
  </tr>
</table>
