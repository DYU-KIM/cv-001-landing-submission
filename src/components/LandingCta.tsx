"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LANDING } from "@/lib/contract";
import { PrimaryButton } from "./fields";

function send(event: string) {
  return fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event }),
  });
}

export default function LandingCta() {
  const router = useRouter();

  // LP-01이 실제로 렌더링된 뒤 한 번만 방문을 기록한다.
  useEffect(() => {
    void send("landing_viewed");
  }, []);

  return (
    <PrimaryButton
      onClick={() => {
        // 기록 실패가 조사 진입을 막지 않도록 응답을 기다리지 않는다.
        void send("cta_clicked");
        router.push("/survey");
      }}
    >
      {LANDING.cta}
    </PrimaryButton>
  );
}
