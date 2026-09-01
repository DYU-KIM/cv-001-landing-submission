import { fail, ok, readJson } from "@/lib/api";
import { LANDING_VERSION } from "@/lib/contract";
import {
  RESPONSE_COOKIE,
  cookieOptions,
  getDeviceClass,
  getResponseId,
  getSessionId,
  getUtm,
} from "@/lib/session";
import { createResponse, logEvent } from "@/lib/store";
import { consentSchema, firstIssue } from "@/lib/validation";

/**
 * SF-00 필수 동의 저장. 여기서 처음으로 응답 ID를 만든다.
 * 동의하지 않으면 응답 ID를 만들지 않는다. (contract SF-00 Failure and exit)
 */
export async function POST(request: Request) {
  const parsed = consentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(400, "동의 항목을 확인해주세요.", firstIssue(parsed.error));
  }

  // 새로고침·중복 제출로 응답이 여러 개 생기지 않게 한다.
  const existing = await getResponseId();
  if (existing) return ok({ responseId: existing });

  const sessionId = await getSessionId();
  const row = await createResponse({
    sessionId,
    utm: await getUtm(),
    landingVersion: LANDING_VERSION,
    locale: "ko",
    deviceClass: await getDeviceClass(),
  });

  await logEvent({
    sessionId,
    responseId: row.response_id,
    event: "consent_completed",
  });

  const response = ok({ responseId: row.response_id });
  response.cookies.set(RESPONSE_COOKIE, row.response_id, cookieOptions);
  return response;
}
