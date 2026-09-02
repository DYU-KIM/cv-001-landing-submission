import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "일본 자유여행 준비 경험 조사",
  /**
   * SNS·검색 미리보기 문구.
   * 여행 시점 조건을 넣지 않는다. 링크만 보고 대상이 아니라고 판단하게 만들면
   * 여행 시점을 사후 분류값으로만 쓰기로 한 결정과 어긋난다. (Q-058)
   */
  description:
    "일본 자유여행을 준비하며 장소·일정·교통정보를 어떤 순서로 찾고 정하는지 듣는 조사입니다. 약 2~3분.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
