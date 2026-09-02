import { checkOperatorKey, ok } from "@/lib/api";
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

  const response = ok({ reset: true });
  response.cookies.set(RESPONSE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
