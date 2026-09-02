import { NextResponse } from "next/server";
import { checkOperatorKey } from "@/lib/api";
import { RESPONSE_COOKIE } from "@/lib/session";

/**
 * 운영자 전용 브라우저 세션 초기화.
 *
 * 응답 쿠키만 지운다. 저장된 응답은 건드리지 않는다.
 * 제출·잠금 뒤에는 조사를 다시 할 수 없는 것이 정상 동작이므로,
 * 검수·리허설 때만 쓰라고 `EXPORT_KEY` 뒤에 둔다. 참가자 화면에는 노출하지 않는다.
 *
 *   GET /api/session/reset?key=<EXPORT_KEY>
 */
export async function GET(request: Request) {
  const denied = checkOperatorKey(request);
  if (denied) return denied;

  // 쿠키를 지우고 바로 첫 화면으로 보낸다.
  // 브라우저에 남은 진행상태는 설문 화면이 서버 세션 없음을 확인하고 스스로 지운다.
  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
  response.cookies.set(RESPONSE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
