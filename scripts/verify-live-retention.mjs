/**
 * 실제 Supabase 대상 차등 보유기간 검사.
 *
 *   node scripts/verify-live-retention.mjs [baseUrl]
 *
 * `.env.local` 의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 직접 읽어
 * 만료·미만료 테스트 행을 넣고 `/api/purge` 실행 전후를 확인한 뒤 정리한다.
 *
 * 앱 API 로는 과거 시각을 만들 수 없어 PostgREST 로 직접 넣는다.
 * `survey_response` 의 updated_at 트리거는 UPDATE 에만 걸려 있어 INSERT 시각은 그대로 저장된다.
 *
 * 넣는 행은 모두 `ffffffff-` 로 시작하는 고정 ID 라서 실제 응답과 섞이지 않고,
 * 검사 끝에 반드시 삭제한다.
 */

import { promises as fs } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";

const env = Object.fromEntries(
  (await fs.readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const URL_BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_KEY = env.EXPORT_KEY;

if (!URL_BASE || !KEY) {
  console.log("SUPABASE 환경변수가 없어 라이브 검사를 건너뜁니다.");
  process.exit(0);
}

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const rest = async (path, init = {}) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
};

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

const ID = {
  partialExpired: "ffffffff-0000-0000-0000-000000000001",
  completedExpired: "ffffffff-0000-0000-0000-000000000002",
  completedFresh: "ffffffff-0000-0000-0000-000000000003",
  notSelected: "ffffffff-0000-0000-0000-000000000004",
  delivered: "ffffffff-0000-0000-0000-000000000005",
  closed: "ffffffff-0000-0000-0000-000000000006",
};
const ALL = Object.values(ID);

async function cleanup() {
  await rest(`survey_response?response_id=in.(${ALL.join(",")})`, {
    method: "DELETE",
  });
}

console.log(`CV-001 live retention → ${base}`);
console.log("\n[준비] 만료·미만료 테스트 행 주입");

await cleanup(); // 이전 실행 잔여물 제거

// PostgREST 는 한 번에 넣는 객체들의 키가 모두 같아야 한다.
const response = (id, status, completedDays, updatedDays) => ({
  response_id: id,
  status,
  problem_locked: status === "problem_completed",
  problem_completed_at: completedDays === null ? null : daysAgo(completedDays),
  updated_at: daysAgo(updatedDays),
  travel_region: "RETENTION-TEST",
});

await rest("survey_response", {
  method: "POST",
  body: JSON.stringify([
    response(ID.partialExpired, "partial", null, 31),
    response(ID.completedExpired, "problem_completed", 400, 400),
    response(ID.completedFresh, "problem_completed", 10, 10),
    response(ID.notSelected, "problem_completed", 60, 60),
    response(ID.delivered, "problem_completed", 60, 60),
    response(ID.closed, "problem_completed", 60, 60),
  ]),
});

for (const id of [ID.notSelected, ID.delivered, ID.closed]) {
  await rest("contact", {
    method: "POST",
    body: JSON.stringify({
      response_id: id,
      email: `retention-test-${id.slice(-1)}@example.invalid`,
      consent_sample: true,
    }),
  });
  await rest("sample_request", {
    method: "POST",
    body: JSON.stringify({
      response_id: id,
      focus: ["hours"],
      needed_by: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    }),
  });
}

const fulfillmentRow = (id, status, selected, lottery, selectedAt, delivered, closed, reason) => ({
  response_id: id,
  review_status: status,
  selected,
  lottery_completed_at: lottery === null ? null : daysAgo(lottery),
  selected_at: selectedAt === null ? null : daysAgo(selectedAt),
  sample_delivered_at: delivered === null ? null : daysAgo(delivered),
  fulfillment_closed_at: closed === null ? null : daysAgo(closed),
  closed_reason_category: reason,
});

await rest("fulfillment", {
  method: "POST",
  body: JSON.stringify([
    fulfillmentRow(ID.notSelected, "not_selected", false, 31, null, null, null, null),
    fulfillmentRow(ID.delivered, "delivered", true, 40, 40, 31, null, null),
    fulfillmentRow(ID.closed, "closed", true, 40, 40, null, 31, "no_response"),
  ]),
});

const before = await rest(
  `survey_response?response_id=in.(${ALL.join(",")})&select=response_id`,
);
check("테스트 행 6건이 주입된다", before.length === 6, `${before.length}건`);

console.log("\n[실행] /api/purge");

const run = await fetch(
  `${base}/api/purge?key=${encodeURIComponent(EXPORT_KEY)}`,
);
const result = await run.json();
check("파기 작업이 성공한다", run.status === 200 && result.ok === true,
  JSON.stringify(result).slice(0, 200));
check("5개 범주를 처리한다", result.results?.length === 5,
  JSON.stringify(result.results));

console.log("\n[확인] 범주별 삭제·보존");

const left = (
  await rest(`survey_response?response_id=in.(${ALL.join(",")})&select=response_id`)
).map((r) => r.response_id);

check("30일 지난 부분응답이 삭제된다", !left.includes(ID.partialExpired));
check("12개월 지난 완료응답이 삭제된다", !left.includes(ID.completedExpired));
check("최근 완료응답은 남는다", left.includes(ID.completedFresh));
check("연락처만 만료된 완료응답은 남는다", left.includes(ID.notSelected));

const contacts = (
  await rest(`contact?response_id=in.(${ALL.join(",")})&select=response_id`)
).map((r) => r.response_id);
check("미선정자 이메일이 추첨 30일 뒤 삭제된다", !contacts.includes(ID.notSelected));
check("선정·제공자 이메일이 제공 30일 뒤 삭제된다", !contacts.includes(ID.delivered));
check("제공 종료 건 이메일이 종료 30일 뒤 삭제된다", !contacts.includes(ID.closed));

const samples = (
  await rest(`sample_request?response_id=in.(${ALL.join(",")})&select=response_id`)
).map((r) => r.response_id);
check("샘플 조건도 함께 삭제된다", samples.length === 0, `${samples.length}건 잔존`);

const fulfil = await rest(
  `fulfillment?response_id=in.(${ALL.join(",")})&select=response_id,sample_delivered_at`,
);
check(
  "행동증거(운영 기록)는 남는다",
  fulfil.length >= 2,
  `${fulfil.length}건`,
);

const log = await rest("purge_log?select=category,deleted&order=id.desc&limit=5");
check("파기 로그에 범주별 건수가 남는다", log.length === 5, JSON.stringify(log));
check(
  "파기 로그에 이메일이 없다",
  !JSON.stringify(log).includes("@"),
);

console.log("\n[재실행]");
const rerun = await fetch(
  `${base}/api/purge?key=${encodeURIComponent(EXPORT_KEY)}`,
);
check("같은 범위를 다시 실행해도 실패하지 않는다", rerun.status === 200);

const denied = await fetch(`${base}/api/purge?key=nope`);
check("인증 없는 파기 호출은 거부된다", denied.status === 401);

console.log("\n[정리] 테스트 행 삭제");
await cleanup();
const remaining = await rest(
  `survey_response?response_id=in.(${ALL.join(",")})&select=response_id`,
);
check("테스트 행이 모두 정리된다", remaining.length === 0, `${remaining.length}건 잔존`);

console.log(`\n결과: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
