import { fail } from "@/lib/api";
import {
  listContacts,
  listEvents,
  listResponses,
  listSampleRequests,
} from "@/lib/store";

/**
 * 운영자 전용 CSV 내보내기.
 *
 * `?dataset=responses|samples|contacts|events`
 * `?key=<EXPORT_KEY>` 또는 `Authorization: Bearer <EXPORT_KEY>`
 *
 * 문제 응답과 연락처는 서로 다른 파일로 내보낸다. 한 파일에 합치지 않는다.
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

export async function GET(request: Request) {
  const expected = process.env.EXPORT_KEY;
  if (!expected) return fail(503, "EXPORT_KEY가 설정되지 않았습니다.");

  const url = new URL(request.url);
  const provided =
    url.searchParams.get("key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return fail(401, "인증되지 않은 요청입니다.");

  const dataset = url.searchParams.get("dataset") ?? "responses";
  let rows: Record<string, unknown>[];
  switch (dataset) {
    case "responses":
      rows = (await listResponses()) as unknown as Record<string, unknown>[];
      break;
    case "samples":
      rows = (await listSampleRequests()) as unknown as Record<string, unknown>[];
      break;
    case "contacts":
      rows = (await listContacts()) as unknown as Record<string, unknown>[];
      break;
    case "events":
      rows = (await listEvents()) as unknown as Record<string, unknown>[];
      break;
    default:
      return fail(400, "알 수 없는 dataset 입니다.");
  }

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
