"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LANDING } from "@/lib/contract";

function send(event: string) {
  return fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event }),
  });
}

/**
 * LP-01 참여 버튼.
 *
 * 페이지 안에 두 번 놓이므로(히어로 + 하단 고정) 방문 기록은 `trackView`를 받은
 * 하나만 발생시킨다. 서버에서도 같은 세션의 중복 이벤트를 한 번만 저장한다.
 */
export default function LandingCta({
  trackView = false,
  compact = false,
}: {
  trackView?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (trackView) void send("landing_viewed");
  }, [trackView]);

  return (
    <button
      type="button"
      onClick={() => {
        // 기록 실패가 조사 진입을 막지 않도록 응답을 기다리지 않는다.
        void send("cta_clicked");
        router.push("/survey");
      }}
      className={`w-full rounded-2xl bg-accent font-semibold text-accent-ink shadow-[0_8px_24px_-8px_rgba(31,79,216,0.6)] transition active:scale-[0.99] ${
        compact ? "px-5 py-3.5 text-base" : "px-6 py-5 text-lg"
      }`}
    >
      {LANDING.cta}
    </button>
  );
}
