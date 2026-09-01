import { fail, ok, readJson } from "@/lib/api";
import { getResponseId, getSessionId } from "@/lib/session";
import { logEvent } from "@/lib/store";

/**
 * 화면 렌더링·클릭처럼 클라이언트만 알 수 있는 행동을 기록한다.
 * 상태를 바꾸는 이벤트(problem_completed 등)는 여기서 받지 않는다.
 * 설문 원문과 이메일은 params에 담지 않는다.
 */
const CLIENT_EVENTS = new Set([
  "landing_viewed",
  "cta_clicked",
  "form_started",
  "sample_request_started",
]);

export async function POST(request: Request) {
  const body = (await readJson(request)) as { event?: string } | null;
  const event = body?.event;

  if (!event || !CLIENT_EVENTS.has(event)) {
    return fail(400, "허용되지 않은 이벤트입니다.");
  }

  await logEvent({
    sessionId: await getSessionId(),
    responseId: await getResponseId(),
    event,
  });

  return ok();
}
