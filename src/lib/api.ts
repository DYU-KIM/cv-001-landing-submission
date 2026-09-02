import "server-only";
import { NextResponse } from "next/server";
import { getResponseId } from "./session";
import { getResponse, type SurveyResponse } from "./store";

export function ok(body: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...body });
}

export function fail(
  status: number,
  message: string,
  options: { fields?: Record<string, string>; code?: string } = {},
) {
  return NextResponse.json(
    { ok: false, message, fields: options.fields, code: options.code },
    { status },
  );
}

/**
 * 진행 중인 응답을 가져온다.
 * 쿠키가 없거나 서버에 없는 ID면 조사를 처음부터 다시 시작하게 한다.
 */
export async function currentResponse(): Promise<
  { row: SurveyResponse } | { error: NextResponse }
> {
  const responseId = await getResponseId();
  if (!responseId) {
    return {
      error: fail(401, "조사 세션이 없습니다. 처음부터 다시 시작해주세요.", {
        code: "NO_SESSION",
      }),
    };
  }
  const row = await getResponse(responseId);
  if (!row) {
    return {
      error: fail(401, "조사 세션을 찾을 수 없습니다. 처음부터 다시 시작해주세요.", {
        code: "NO_SESSION",
      }),
    };
  }
  return { row };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** 운영자 전용 엔드포인트 인증. EXPORT_KEY 는 환경변수로만 관리한다. */
export function checkOperatorKey(request: Request): NextResponse | null {
  const expected = process.env.EXPORT_KEY;
  if (!expected) return fail(503, "EXPORT_KEY가 설정되지 않았습니다.");
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return fail(401, "인증되지 않은 요청입니다.");
  return null;
}
