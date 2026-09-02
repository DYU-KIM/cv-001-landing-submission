import { currentResponse, fail, ok, readJson } from "@/lib/api";
import { logEvent } from "@/lib/store";

/**
 * 동의 후 화면 행동만 기록한다.
 *
 * `landing_viewed`와 `cta_clicked`는 동의 전 행동이라 여기서 받지 않는다.
 * 그 둘은 `/api/aggregate`의 집계 카운터로만 남고 `response_id`와 연결되지 않는다.
 */
const CLIENT_EVENTS = new Set(["form_started", "sample_request_started"]);

export async function POST(request: Request) {
  const body = (await readJson(request)) as { event?: string } | null;
  const event = body?.event;

  if (!event || !CLIENT_EVENTS.has(event)) {
    return fail(400, "허용되지 않은 이벤트입니다.");
  }

  const found = await currentResponse();
  if ("error" in found) return found.error;

  await logEvent({ responseId: found.row.response_id, event });
  return ok();
}
