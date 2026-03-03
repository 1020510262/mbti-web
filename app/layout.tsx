import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBTI Fun Test",
  description: "年轻有梗版 MBTI 测试"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
