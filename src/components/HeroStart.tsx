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

/**
 * 첫 질문을 랜딩에서 바로 받는다.
 *
 * 여기서 고른 값은 저장하지 않는다. 화면 이동에만 쓰고, 실제 저장은
 * 동의(SF-00) 이후 SF-01에서 이뤄진다.
 */
export default function HeroStart() {
  const router = useRouter();
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    void send("landing_viewed");
  }, []);

  const start = (value: string) => {
    void send("cta_clicked");
    router.push(`/survey?s=${value}`);
  };

  return (
    <div className="max-w-[30rem]">
      <p className="mb-3 font-semibold">{LANDING.heroQuestion.label}</p>

      <div className="grid gap-2.5">
        {LANDING.heroQuestion.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => start(option.value)}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-left font-medium shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-accent hover:shadow-[0_8px_24px_-12px_rgba(31,79,216,0.45)] active:scale-[0.995]"
          >
            <span>{option.label}</span>
            <span
              aria-hidden
              className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
            >
              →
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">{LANDING.heroQuestion.note}</p>

      {optedOut ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-soft p-4 text-sm text-muted"
        >
          {LANDING.heroQuestion.optOutMessage}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setOptedOut(true)}
          className="mt-4 text-sm text-muted underline underline-offset-4"
        >
          {LANDING.heroQuestion.optOut}
        </button>
      )}
    </div>
  );
}
