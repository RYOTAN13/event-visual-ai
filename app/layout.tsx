import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Visual AI",
  description: "事件名から、ドキュメンタリー用の画像シーンを生成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
