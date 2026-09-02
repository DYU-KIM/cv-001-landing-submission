import "server-only";
import { cookies, headers } from "next/headers";
import type { Utm } from "./store";

/**
 * 동의 전에는 어떤 쿠키·로컬스토리지 식별값도 만들지 않는다. (Q-053)
 * 여기 있는 쿠키는 동의 저장이 성공한 뒤에만 발급되는 응답 연결키 하나뿐이다.
 */
export const RESPONSE_COOKIE = "cv_rid";

const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function getResponseId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(RESPONSE_COOKIE)?.value ?? null;
}

/** 모바일·데스크톱 차이 비교용 대분류. 전체 User-Agent 문자열은 저장하지 않는다. */
export async function getDeviceClass(): Promise<string> {
  const ua = (await headers()).get("user-agent") ?? "";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

const UTM_KEYS = ["source", "medium", "campaign", "content"] as const;
const UTM_MAX = 80;

/**
 * 캠페인 코드만 받는다. 개인정보가 아니고 응답과 사후 연결되는 식별자도 아니다.
 * 값이 길거나 문자열이 아니면 버린다.
 */
export function readUtm(input: unknown): Utm {
  const out: Utm = {};
  if (!input || typeof input !== "object") return out;
  const source = input as Record<string, unknown>;
  for (const key of UTM_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= UTM_MAX) {
      out[key] = value;
    }
  }
  return out;
}
