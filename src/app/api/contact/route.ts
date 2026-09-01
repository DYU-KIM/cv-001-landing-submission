import { currentResponse, fail, ok, readJson } from "@/lib/api";
import { logEvent, saveContact, updateResponse } from "@/lib/store";
import { contactSchema, firstIssue } from "@/lib/validation";

/**
 * SR-02 연락처 저장.
 *
 * 이메일은 contact 저장소에만 들어가고 문제 응답과는 response_id 로만 연결한다.
 * 이메일 형식 오류가 나도 앞 단계의 문제 응답과 샘플 조건은 이미 저장돼 있다.
 */
export async function POST(request: Request) {
  const found = await currentResponse();
  if ("error" in found) return found.error;
  const row = found.row;

  if (!row.sample_requested_at) {
    return fail(409, "샘플 요청 조건을 먼저 저장해주세요.");
  }

  const parsed = contactSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(400, "입력을 확인해주세요.", firstIssue(parsed.error));
  }

  await saveContact({
    responseId: row.response_id,
    email: parsed.data.email,
    consentSample: parsed.data.consentSample,
    consentFollowup: parsed.data.consentFollowup,
  });

  await updateResponse(row.response_id, {
    contact_submitted_at: row.contact_submitted_at ?? new Date().toISOString(),
  });

  await logEvent({
    sessionId: row.session_id,
    responseId: row.response_id,
    event: "contact_submitted",
    params: { followup_consent: parsed.data.consentFollowup },
  });

  return ok({ next: "done" });
}
