import { checkOperatorKey, fail, ok } from "@/lib/api";
import { purgeExpired } from "@/lib/store";

/**
 * 차등 자동파기. (계약서 Retention And Automatic Deletion, Q-054)
 *
 * Vercel Cron이 하루 한 번 호출한다. 실패하면 같은 범위를 그대로 다시 호출해
 * 재실행할 수 있다. 실행시각·범주·건수만 남기고 이메일·설문 원문은 로그에 넣지 않는다.
 *
 * 인증: Vercel Cron 의 `Authorization: Bearer <CRON_SECRET>` 또는 운영자 `EXPORT_KEY`.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const fromCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  if (!fromCron) {
    const denied = checkOperatorKey(request);
    if (denied) return denied;
  }

  try {
    const results = await purgeExpired();
    return ok({ ranAt: new Date().toISOString(), results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return fail(500, `파기 작업이 실패했습니다: ${message}`, {
      code: "PURGE_FAILED",
    });
  }
}

export const POST = GET;
