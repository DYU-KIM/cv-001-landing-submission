import { checkOperatorKey, fail, ok, readJson } from "@/lib/api";
import { getResponse, logEvent, upsertFulfillment } from "@/lib/store";

/**
 * 운영자 전용 추첨·제공 상태 기록.
 *
 * 관리자 화면은 이번 범위 밖이라 이 엔드포인트로 상태만 기록한다.
 * 추첨 인원·날짜·제공기한은 Founder가 정하며 여기에 상수로 두지 않는다. (Q-055)
 *
 * POST /api/fulfillment?key=<EXPORT_KEY>
 *   { responseId, action: "lottery" | "select" | "deliver" | "close",
 *     closedReasonCategory?: string, note?: string }
 */
const ACTIONS = ["lottery", "select", "deliver", "close"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  const denied = checkOperatorKey(request);
  if (denied) return denied;

  const body = (await readJson(request)) as {
    responseId?: string;
    action?: string;
    closedReasonCategory?: string;
    note?: string;
  } | null;

  const responseId = body?.responseId;
  const action = body?.action as Action | undefined;

  if (!responseId || !action || !ACTIONS.includes(action)) {
    return fail(400, "responseId와 action이 필요합니다.");
  }
  if (!(await getResponse(responseId))) {
    return fail(404, "응답을 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();

  switch (action) {
    case "lottery": {
      // 추첨 완료. 미선정 처리이며 30일 뒤 연락처·샘플조건이 파기된다.
      const row = await upsertFulfillment(responseId, {
        review_status: "not_selected",
        lottery_completed_at: now,
        selected: false,
        operator_note: body?.note ?? null,
      });
      return ok({ fulfillment: row });
    }
    case "select": {
      const row = await upsertFulfillment(responseId, {
        review_status: "selected",
        lottery_completed_at: now,
        selected: true,
        selected_at: now,
        operator_note: body?.note ?? null,
      });
      await logEvent({ responseId, event: "sample_selected" });
      return ok({ fulfillment: row });
    }
    case "deliver": {
      const row = await upsertFulfillment(responseId, {
        review_status: "delivered",
        sample_delivered_at: now,
        operator_note: body?.note ?? null,
      });
      await logEvent({ responseId, event: "sample_delivered" });
      return ok({ fulfillment: row });
    }
    case "close": {
      if (!body?.closedReasonCategory) {
        return fail(400, "closedReasonCategory가 필요합니다.");
      }
      const row = await upsertFulfillment(responseId, {
        review_status: "closed",
        fulfillment_closed_at: now,
        closed_reason_category: body.closedReasonCategory,
        operator_note: body?.note ?? null,
      });
      return ok({ fulfillment: row });
    }
  }
}
