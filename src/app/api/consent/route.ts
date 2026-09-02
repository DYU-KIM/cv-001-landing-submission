import { fail, ok, readJson } from "@/lib/api";
import { LANDING_VERSION } from "@/lib/contract";
import {
  RESPONSE_COOKIE,
  cookieOptions,
  getDeviceClass,
  getResponseId,
  readUtm,
} from "@/lib/session";
import { createResponse, logEvent } from "@/lib/store";
import { consentSchema, firstIssue } from "@/lib/validation";

/**
 * SF-00 필수 동의 저장.
 *
 * 여기서 처음으로 `response_id`를 만든다. 동의 저장이 성공하기 전에는
 * 응답 ID도, 개인별 쿠키도 존재하지 않는다. (Q-053)
 * 나이 확인 항목은 받지 않는다. (Q-059)
 */
export async function POST(request: Request) {
  const body = (await readJson(request)) as
    | { consent?: unknown; utm?: unknown }
    | null;

  const parsed = consentSchema.safeParse({ consent: body?.consent });
  if (!parsed.success) {
    return fail(400, "동의 항목을 확인해주세요.", {
      fields: firstIssue(parsed.error),
    });
  }

  // 새로고침·중복 제출로 응답이 여러 개 생기지 않게 한다.
  const existing = await getResponseId();
  if (existing) return ok({ responseId: existing });

  const row = await createResponse({
    utm: readUtm(body?.utm),
    landingVersion: LANDING_VERSION,
    locale: "ko",
    deviceClass: await getDeviceClass(),
  });

  await logEvent({ responseId: row.response_id, event: "consent_completed" });

  const response = ok({ responseId: row.response_id });
  response.cookies.set(RESPONSE_COOKIE, row.response_id, cookieOptions);
  return response;
}
