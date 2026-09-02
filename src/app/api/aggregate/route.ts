import { fail, ok, readJson } from "@/lib/api";
import { LANDING_VERSION } from "@/lib/contract";
import { getDeviceClass, readUtm } from "@/lib/session";
import { bumpLandingCounter, type LandingCounter } from "@/lib/store";

/**
 * 동의 전 측정. (계약서 Pre-consent aggregate measurement, Q-053)
 *
 * 날짜·유입경로·페이지 버전·언어·기기 유형 조합의 카운터만 올린다.
 * 응답 행, 개인별 이벤트 행, 식별 쿠키를 만들지 않으며 쿠키를 읽지도 않는다.
 * 원본 IP·전체 User-Agent·정확한 위치는 저장하지 않는다.
 */
const COUNTERS: Record<string, LandingCounter> = {
  landing_viewed: "landing_viewed_count",
  cta_clicked: "cta_clicked_count",
};

export async function POST(request: Request) {
  const body = (await readJson(request)) as
    | { counter?: string; utm?: unknown }
    | null;
  const column = body?.counter ? COUNTERS[body.counter] : undefined;

  if (!column) return fail(400, "허용되지 않은 집계 항목입니다.");

  await bumpLandingCounter(
    {
      utm: readUtm(body?.utm),
      landingVersion: LANDING_VERSION,
      locale: "ko",
      deviceClass: await getDeviceClass(),
    },
    column,
  );

  return ok();
}
