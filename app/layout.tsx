import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude 公开卖家帖检索 · 2026-11-15 ET",
  description:
    "2026-11-15 美东公开帖与次日只读核查的静态快照。对照原文、评论和当时的落地页条款，不推荐购买，也不做可靠性排名。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
