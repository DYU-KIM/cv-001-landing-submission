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
  fields?: Record<string, string>,
) {
  return NextResponse.json({ ok: false, message, fields }, { status });
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
    return { error: fail(401, "조사 세션이 없습니다. 처음부터 다시 시작해주세요.") };
  }
  const row = await getResponse(responseId);
  if (!row) {
    return { error: fail(401, "조사 세션을 찾을 수 없습니다. 처음부터 다시 시작해주세요.") };
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
