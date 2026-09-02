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
  const parsed = sampleSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
  }

  // 여행 시점으로 신청을 막지는 않는다. 다만 준비 중이라고 답했으면
  // 제작 우선순위를 정할 수 있도록 필요 시점을 받는다.
  if (hasUpcomingTrip(row.travel_experience) && !parsed.data.neededBy) {
    return fail(400, "입력을 확인해주세요.", {
      fields: { neededBy: "여행 준비 중이시라면 필요한 시점을 알려주세요." },
    });
  }

  await saveSampleRequest({
    responseId: row.response_id,
    focus: parsed.data.focus,
    focusOther: parsed.data.focusOther || null,
    note: parsed.data.note || null,
    neededBy: parsed.data.neededBy || null,
  });

  await updateResponse(row.response_id, {
    sample_requested_at: row.sample_requested_at ?? new Date().toISOString(),
  });

  await logEvent({ responseId: row.response_id, event: "sample_requested" });

  return ok({ next: "contact" });
}
