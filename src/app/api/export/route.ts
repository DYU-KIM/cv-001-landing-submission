import { checkOperatorKey, fail } from "@/lib/api";
import {
  listContacts,
  listEvents,
  listFulfillment,
  listLandingAggregates,
  listPurgeLog,
  listResponses,
  listSampleRequests,
} from "@/lib/store";

/**
 * 운영자 전용 CSV 내보내기.
 *
 * `?dataset=responses|samples|contacts|events|fulfillment|landing|purge`
 * `?key=<EXPORT_KEY>` 또는 `Authorization: Bearer <EXPORT_KEY>`
 *
 * 문제응답과 연락처는 서로 다른 파일로 내보낸다. 한 파일에 합치지 않는다.
 * 나이 관련 열은 존재하지 않는다.
 */

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value)
      ? value.join("|")
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => cell(row[c])).join(",")),
  ].join("\n");
}

const DATASETS: Record<string, () => Promise<unknown[]>> = {
  responses: listResponses,
  samples: listSampleRequests,
  contacts: listContacts,
  events: listEvents,
  fulfillment: listFulfillment,
  landing: listLandingAggregates,
  purge: listPurgeLog,
};

export async function GET(request: Request) {
  const denied = checkOperatorKey(request);
  if (denied) return denied;

  const dataset = new URL(request.url).searchParams.get("dataset") ?? "responses";
  const load = DATASETS[dataset];
  if (!load) return fail(400, "알 수 없는 dataset 입니다.");

  const rows = (await load()) as Record<string, unknown>[];
  const today = new Date().toISOString().slice(0, 10);

  // 엑셀에서 한글이 깨지지 않도록 BOM을 붙인다.
  return new Response(`﻿${toCsv(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cv-001-${dataset}-${today}.csv"`,
      "cache-control": "no-store",
    },
  });
}
