"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LANDING } from "@/lib/contract";

/**
 * LP-01 참여 버튼.
 *
 * 동의 전이므로 쿠키·로컬스토리지·응답 ID를 만들지 않고 집계 카운터만 올린다. (Q-053)
 * 캠페인 코드는 URL로만 다음 화면에 넘긴다.
 */
function utmParams(): URLSearchParams {
  const from = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  for (const key of ["source", "medium", "campaign", "content"]) {
    const value = from.get(`utm_${key}`);
    if (value) out.set(`utm_${key}`, value);
  }
  return out;
}

function utmObject(): Record<string, string> {
  const params = utmParams();
  const out: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "content"]) {
    const value = params.get(`utm_${key}`);
    if (value) out[key] = value;
  }
  return out;
}

function bump(counter: "landing_viewed" | "cta_clicked") {
  return fetch("/api/aggregate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ counter, utm: utmObject() }),
  });
}

export default function StartCta({
  trackView = false,
}: {
  trackView?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (trackView) void bump("landing_viewed");
  }, [trackView]);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          // 집계 실패가 조사 진입을 막지 않도록 응답을 기다리지 않는다.
          void bump("cta_clicked");
          const query = utmParams().toString();
          router.push(query ? `/survey?${query}` : "/survey");
        }}
        className="h-14 w-full rounded-2xl bg-accent px-5 text-[17px] font-semibold text-accent-ink transition hover:bg-accent-hover"
      >
        {LANDING.cta}
      </button>
      <p className="mt-4 text-center text-sm text-muted">{LANDING.ctaNote}</p>
    </div>
  );
}
