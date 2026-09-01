"use client";

import { useEffect, useState } from "react";
import { LANDING } from "@/lib/contract";

/**
 * 모바일 하단 고정 CTA.
 *
 * 히어로의 첫 질문이 화면에서 사라진 뒤에만 나타난다.
 * 첫 질문을 건너뛰게 하지 않고 그 자리로 되돌려 보낸다.
 */
export default function StickyCta({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <button
        type="button"
        onClick={() =>
          document
            .getElementById(targetId)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        className="w-full rounded-2xl bg-accent px-5 py-3.5 font-semibold text-accent-ink"
      >
        {LANDING.cta}
      </button>
    </div>
  );
}
