import { currentResponse, fail, ok } from "@/lib/api";
import { logEvent, updateResponse } from "@/lib/store";

/**
 * SO-01 핵심 내용이 실제로 렌더링된 뒤 한 번 호출한다.
 *
 * 잠금은 최종 문제응답 저장 시점(`/api/step` impact)에 이미 끝나 있다.
 * 여기서는 노출 사실만 기록한다. 잠기지 않은 응답에는 해결책을 열지 않는다.
 */
export async function POST() {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (row.status !== "problem_completed" || !row.problem_locked) {
    return fail(409, "문제 응답이 저장되지 않았습니다.", {
      code: "PROBLEM_RESPONSE_NOT_COMPLETED",
    });
  }

  if (!row.solution_viewed_at) {
    await updateResponse(row.response_id, {
      solution_viewed_at: new Date().toISOString(),
    });
    await logEvent({ responseId: row.response_id, event: "solution_viewed" });
  }

  return ok();
}
