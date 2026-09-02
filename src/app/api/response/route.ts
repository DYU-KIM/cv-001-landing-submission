import { currentResponse, ok } from "@/lib/api";

/**
 * 본인 응답의 읽기 전용 조회.
 *
 * 제출·잠금 뒤 뒤로가기나 새로고침에서 제출한 답변을 읽기 전용으로 보여주기 위한 것이다.
 * 쿠키에 담긴 자기 `response_id` 외에는 조회할 수 없고, 여기서는 어떤 값도 쓰지 않는다.
 */
export async function GET() {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  return ok({
    response: {
      status: row.status,
      problemLocked: row.problem_locked,
      solutionViewed: !!row.solution_viewed_at,
      sampleRequested: !!row.sample_requested_at,
      contactSubmitted: !!row.contact_submitted_at,
      travelExperience: row.travel_experience,
      planningScope: row.planning_scope,
      travelRegion: row.travel_region,
      incType: row.inc_type,
      incDescription: row.inc_description,
      incTiming: row.inc_timing,
      srcFirst: row.src_first,
      srcNext: row.src_next,
      srcMoveReasons: row.src_move_reasons,
      srcMoveReasonOther: row.src_move_reason_other,
      impOutcomes: row.imp_outcomes,
      impOutcomeOther: row.imp_outcome_other,
      impExtraTime: row.imp_extra_time,
      altSufficientNote: row.alt_sufficient_note,
    },
  });
}
