"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANDING } from "@/lib/contract";

function send(event: string) {
  return fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event }),
  });
}

export type HeroVariant = "soft" | "editorial" | "brutal";

const STYLES: Record<
  HeroVariant,
  { button: string; label: string; note: string; optOut: string; message: string }
> = {
  soft: {
    button:
      "flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-left font-medium shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-accent active:scale-[0.995]",
    label: "mb-3 font-semibold",
    note: "mt-3 text-sm text-muted",
    optOut: "mt-4 text-sm text-muted underline underline-offset-4",
    message: "mt-4 rounded-xl bg-soft p-4 text-sm text-muted",
  },
  editorial: {
    button:
      "flex w-full items-center justify-between gap-3 border-b border-line bg-transparent py-4 text-left text-lg transition hover:border-ink",
    label:
      "mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted",
    note: "mt-5 text-sm text-muted",
    optOut: "mt-5 text-sm text-muted underline underline-offset-4",
    message: "mt-5 border-l-2 border-line pl-4 text-sm text-muted",
  },
  brutal: {
    button:
      "flex w-full items-center justify-between gap-3 border-2 border-ink bg-white px-5 py-4 text-left font-semibold shadow-[4px_4px_0_0_var(--color-ink)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_var(--color-ink)]",
    label: "mb-3 font-mono text-sm font-bold uppercase",
    note: "mt-3 font-mono text-xs",
    optOut: "mt-4 font-mono text-xs underline underline-offset-4",
    message: "mt-4 border-2 border-ink bg-white p-4 text-sm",
  },
};

/**
 * 첫 질문을 랜딩에서 바로 받는다.
 *
 * 여기서 고른 값은 저장하지 않는다. 화면 이동에만 쓰고, 실제 저장은
 * 동의(SF-00) 이후 SF-01에서 이뤄진다.
 */
export default function HeroStart({
  variant = "soft",
  trackView = true,
}: {
  variant?: HeroVariant;
  trackView?: boolean;
}) {
  const router = useRouter();
  const [optedOut, setOptedOut] = useState(false);
  const s = STYLES[variant];

  useEffect(() => {
    if (trackView) void send("landing_viewed");
  }, [trackView]);

  const start = (value: string) => {
    void send("cta_clicked");
    router.push(`/survey?s=${value}`);
  };

  return (
    <div>
      <p className={s.label}>{LANDING.heroQuestion.label}</p>

      <div className={variant === "editorial" ? "" : "grid gap-2.5"}>
        {LANDING.heroQuestion.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => start(option.value)}
            className={s.button}
          >
            <span>{option.label}</span>
            <span aria-hidden className="text-muted">
              →
            </span>
          </button>
        ))}
      </div>

      <p className={s.note}>{LANDING.heroQuestion.note}</p>

      {optedOut ? (
        <p role="status" className={s.message}>
          {LANDING.heroQuestion.optOutMessage}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setOptedOut(true)}
          className={s.optOut}
        >
          {LANDING.heroQuestion.optOut}
        </button>
      )}
    </div>
  );
}
