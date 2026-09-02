import { currentResponse, fail, ok, readJson } from "@/lib/api";
import { logEvent, saveContact, updateResponse } from "@/lib/store";
import { contactSchema, firstIssue } from "@/lib/validation";

/**
 * SR-02 연락처 저장.
 *
 * 이메일은 contact 저장소에만 들어가고 문제응답과는 response_id 로만 연결한다.
 * 후속 사용조사 동의는 받지 않는다. (Q-052)
 */
export async function POST(request: Request) {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (!row.sample_requested_at) {
    return fail(409, "샘플 신청 조건을 먼저 저장해주세요.", {
      code: "SAMPLE_REQUEST_MISSING",
    });
  }

  const parsed = contactSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", { fields: firstIssue(parsed.error) });
  }

  await saveContact({
    responseId: row.response_id,
    email: parsed.data.email,
    consentSample: parsed.data.consentSample,
  });

  await updateResponse(row.response_id, {
    contact_submitted_at: row.contact_submitted_at ?? new Date().toISOString(),
  });

  await logEvent({ responseId: row.response_id, event: "contact_submitted" });

  return ok({ next: "done" });
}
