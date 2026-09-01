import "server-only";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "cv_sid";
export const UTM_COOKIE = "cv_utm";
export const RESPONSE_COOKIE = "cv_rid";

const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

/** 미들웨어가 심어둔 익명 세션 ID. 없으면 임시 ID로 대체한다. */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? "no-session";
}

export async function getResponseId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(RESPONSE_COOKIE)?.value ?? null;
}

export async function getUtm(): Promise<{
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
}> {
  const jar = await cookies();
  const raw = jar.get(UTM_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    return {};
  }
}

/** 모바일·데스크톱 오류 비교용 대분류. 상세 UA 문자열은 저장하지 않는다. */
export async function getDeviceClass(): Promise<string> {
  const ua = (await headers()).get("user-agent") ?? "";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}
