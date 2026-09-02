import { currentResponse, fail, ok, readJson } from "@/lib/api";
import {
  completeAndLock,
  logEvent,
  updateResponse,
  type SurveyResponse,
} from "@/lib/store";
import {
  firstIssue,
  impactSchema,
  incidentSchema,
  sourcesSchema,
  travelContextSchema,
} from "@/lib/validation";

/**
 * SF-01 ~ SF-04 단계 저장.
 *
 * 저장 성공 전에는 다음 단계로 보내지 않는다. 응답 본문의 `next`로만 화면을 이동한다.
 * 최종 저장과 잠금은 하나의 성공 단위이며, 잠긴 뒤에는 어떤 경로로도 원문을 바꿀 수 없다. (Q-057)
 * 여행 시점·계획 관여도 때문에 종료되는 경로는 없다. (Q-058)
 */
export async function POST(request: Request) {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  const body = (await readJson(request)) as
    | { step?: string; values?: unknown }
    | null;
  const step = body?.step;
  const values = body?.values;

  // 최종 제출의 중복 클릭은 기존 완료 상태를 그대로 돌려준다.
  if (row.problem_locked) {
    if (step === "impact") {
      return ok({ next: "solution", alreadyCompleted: true });
    }
    return fail(409, "제출이 완료된 응답은 수정할 수 없습니다.", {
      code: "PROBLEM_RESPONSE_LOCKED",
    });
  }

  switch (step) {
    case "travelContext":
      return saveTravelContext(row, values);
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
    responseId: row.response_id,
    event: "step_completed",
    step,
  });
}

// ------------------------------------------------------------------ SF-01

async function saveTravelContext(row: SurveyResponse, values: unknown) {
  const parsed = travelContextSchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
  }

  await updateResponse(row.response_id, {
    travel_experience: parsed.data.experience,
    planning_scope: parsed.data.planningScope,
    travel_region: parsed.data.region || null,
    status: "partial",
    form_started_at: row.form_started_at ?? new Date().toISOString(),
    last_step: "travelContext",
  });

  await stepSaved(row, "travelContext");
  await logEvent({
    responseId: row.response_id,
    event: "travel_context_completed",
  });

  // 여행 시점·계획 관여도와 무관하게 모든 응답자가 SF-02로 간다.
  return ok({ next: "incident" });
}

// ------------------------------------------------------------------ SF-02

async function saveIncident(row: SurveyResponse, values: unknown) {
  const parsed = incidentSchema.safeParse(values);
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
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
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
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
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
  }

  const { alreadyCompleted } = await completeAndLock(row.response_id, {
    imp_outcomes: parsed.data.impOutcomes,
    imp_outcome_other: parsed.data.impOutcomeOther || null,
    imp_extra_time: parsed.data.impExtraTime || null,
    alt_sufficient_note: parsed.data.altSufficientNote || null,
  });

  if (alreadyCompleted) {
    return ok({ next: "solution", alreadyCompleted: true });
  }

  await stepSaved(row, "impact");
  await logEvent({ responseId: row.response_id, event: "problem_completed" });

  return ok({ next: "solution" });
}
