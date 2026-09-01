import { currentResponse, fail, ok } from "@/lib/api";
import { LOCK_PROBLEM_AFTER_SOLUTION } from "@/lib/contract";
import { logEvent, updateResponse } from "@/lib/store";

/**
 * SO-01 핵심 내용이 실제로 렌더링된 뒤 한 번 호출한다.
 *
 * - 문제 응답이 저장되지 않은 상태에서는 해결책을 노출로 기록하지 않는다.
 * - 노출 시점에 문제 답변을 잠근다. (D-LOCK-01, 2026-09-01)
 */
export async function POST() {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (row.status !== "problem_completed") {
    return fail(409, "문제 응답이 저장되지 않았습니다.");
  }

  if (!row.solution_viewed_at) {
    await updateResponse(row.response_id, {
      solution_viewed_at: new Date().toISOString(),
      problem_locked: LOCK_PROBLEM_AFTER_SOLUTION,
    });
    await logEvent({
      sessionId: row.session_id,
      responseId: row.response_id,
      event: "solution_viewed",
    });
  }

  return ok();
}
