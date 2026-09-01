import { currentResponse, fail, ok, readJson } from "@/lib/api";
import { logEvent, updateResponse, type SurveyResponse } from "@/lib/store";
import {
  eligibilitySchema,
  firstIssue,
  impactSchema,
  incidentSchema,
  ineligibleReason,
  sourcesSchema,
} from "@/lib/validation";

/**
 * SF-01 ~ SF-04 단계 저장.
 *
 * 저장 성공 전에는 다음 단계로 보내지 않는다. 응답 본문의 `next`로만 화면을 이동한다.
 * 해결책을 본 뒤에는 문제 답변을 잠근다. (D-LOCK-01)
 */
export async function POST(request: Request) {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (row.problem_locked) {
    return fail(409, "제출이 완료된 응답은 수정할 수 없습니다.");
  }

  const body = (await readJson(request)) as
    | { step?: string; values?: unknown }
    | null;
  const step = body?.step;
  const values = body?.values;

  switch (step) {
    case "eligibility":
      return saveEligibility(row, values);
    case "incident":
      return saveIncident(row, values);
    case "sources":
      return saveSources(row, values);
    case "impact":
      return saveImpact(row, values);
    default:
      return fail(400, "알 수 없는 단계입니다.");
  }
}

async function stepSaved(row: SurveyResponse, step: string) {
  await logEvent({
    sessionId: row.session_id,
    responseId: row.response_id,
    event: "step_completed",
    step,
  });
}

// ------------------------------------------------------------------ SF-01

async function saveEligibility(row: SurveyResponse, values: unknown) {
  const parsed = eligibilitySchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", firstIssue(parsed.error));
  }
  const reason = ineligibleReason(parsed.data);

  await updateResponse(row.response_id, {
    elig_status: parsed.data.eligStatus,
    elig_scope: parsed.data.eligScope,
    elig_region: parsed.data.eligRegion,
    ineligible_reason: reason,
    status: reason ? "ineligible" : "partial",
    form_started_at: row.form_started_at ?? new Date().toISOString(),
    last_step: "eligibility",
  });

  if (reason) {
    await logEvent({
      sessionId: row.session_id,
      responseId: row.response_id,
      event: "ineligible_completed",
      params: { reason },
    });
    return ok({ next: "ineligible" });
  }

  await stepSaved(row, "eligibility");
  return ok({ next: "incident" });
}

// ------------------------------------------------------------------ SF-02

async function saveIncident(row: SurveyResponse, values: unknown) {
  const parsed = incidentSchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", firstIssue(parsed.error));
  }
  await updateResponse(row.response_id, {
    inc_type: parsed.data.incType,
    inc_description:
      parsed.data.incType === "none" ? null : parsed.data.incDescription,
    inc_timing: parsed.data.incTiming,
    last_step: "incident",
  });
  await stepSaved(row, "incident");
  return ok({ next: "sources" });
}

// ------------------------------------------------------------------ SF-03

async function saveSources(row: SurveyResponse, values: unknown) {
  const parsed = sourcesSchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", firstIssue(parsed.error));
  }
  await updateResponse(row.response_id, {
    src_first: parsed.data.srcFirst,
    src_next: parsed.data.srcNext,
    src_move_reasons: parsed.data.srcMoveReasons,
    src_move_reason_other: parsed.data.srcMoveReasonOther || null,
    last_step: "sources",
  });
  await stepSaved(row, "sources");
  return ok({ next: "impact" });
}

// ------------------------------------------------------------------ SF-04

async function saveImpact(row: SurveyResponse, values: unknown) {
  const parsed = impactSchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", firstIssue(parsed.error));
  }

  // 연속 클릭으로 problem_completed_at 이 덮이지 않게 한다.
  const completedAt = row.problem_completed_at ?? new Date().toISOString();

  await updateResponse(row.response_id, {
    imp_outcomes: parsed.data.impOutcomes,
    imp_outcome_other: parsed.data.impOutcomeOther || null,
    imp_extra_time: parsed.data.impExtraTime || null,
    alt_sufficient_note: parsed.data.altSufficientNote || null,
    status: "problem_completed",
    problem_completed_at: completedAt,
    last_step: "impact",
  });

  await stepSaved(row, "impact");
  await logEvent({
    sessionId: row.session_id,
    responseId: row.response_id,
    event: "problem_completed",
  });

  return ok({ next: "solution" });
}
