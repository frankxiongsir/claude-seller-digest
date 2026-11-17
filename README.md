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

## 联系我

发现信息有误、条款已更新，或者想补充某个卖家的公开信息，欢迎联系，也可以直接在本仓库提 Issue。

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
