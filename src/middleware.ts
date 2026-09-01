import { NextResponse, type NextRequest } from "next/server";

/**
 * 익명 세션 쿠키와 유입정보를 서버에서 확정한다.
 *
 * - `cv_sid`  : 로그인 없는 방문·응답 연결용 무작위 ID (contract: anonymous_session_id)
 * - `cv_utm`  : 랜딩 진입 시점의 UTM. 클라이언트가 보내는 값을 신뢰하지 않기 위해 서버에서 저장한다.
 *
 * 두 쿠키 모두 조사 진행에 필요한 기능 쿠키이며 광고·추적 목적으로 사용하지 않는다.
 * 원본 IP와 정확한 위치정보는 저장하지 않는다.
 */

const SESSION_COOKIE = "cv_sid";
const UTM_COOKIE = "cv_utm";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  }

  const params = request.nextUrl.searchParams;
  const utm = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    content: params.get("utm_content"),
  };
  if (Object.values(utm).some(Boolean)) {
    response.cookies.set(UTM_COOKIE, JSON.stringify(utm), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
