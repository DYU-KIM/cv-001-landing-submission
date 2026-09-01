import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "일본 자유여행 준비 경험 조사",
  description:
    "최근 일본 자유여행을 다녀왔거나 준비 중인 분들이 장소·일정·교통정보를 어떤 순서로 찾고 결정하는지 조사합니다.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
