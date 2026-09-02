import { currentResponse, fail, ok, readJson } from "@/lib/api";
import { logEvent, saveSampleRequest, updateResponse } from "@/lib/store";
import { firstIssue, hasUpcomingTrip, sampleSchema } from "@/lib/validation";

/** SR-01 샘플 신청 조건 저장. 연락처는 다음 단계에서 별도 저장한다. */
export async function POST(request: Request) {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (row.status !== "problem_completed") {
    return fail(409, "문제 응답을 먼저 제출해주세요.", {
      code: "PROBLEM_RESPONSE_NOT_COMPLETED",
    });
  }
  if (!hasUpcomingTrip(row.travel_experience)) {
    return fail(403, "현재는 일본 여행을 준비 중인 분에게만 샘플을 제작하고 있습니다.", {
      code: "SAMPLE_NOT_AVAILABLE",
    });
  }

  const parsed = sampleSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
  }

  await saveSampleRequest({
    responseId: row.response_id,
    focus: parsed.data.focus,
    focusOther: parsed.data.focusOther || null,
    note: parsed.data.note || null,
    neededBy: parsed.data.neededBy,
  });

  await updateResponse(row.response_id, {
    sample_requested_at: row.sample_requested_at ?? new Date().toISOString(),
  });

  await logEvent({ responseId: row.response_id, event: "sample_requested" });

  return ok({ next: "contact" });
}
