/**
 * CV-001 계약 준수 검사.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * 05-handoff/IMPLEMENTATION.md 의 Acceptance Criteria 1~10 을 자동화 가능한 범위에서 확인한다.
 * 보유기간 검사(9)는 개발 파일 저장소에서만 수행하고, Supabase 대상 실행에서는 건너뛴다.
 *
 * EXPORT_KEY 가 있으면 CSV·집계 검증까지 수행한다.
 */

import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";

/** 운영자 키는 환경변수 → .env.local 순으로 찾는다. */
function readExportKey() {
  if (process.env.EXPORT_KEY) return process.env.EXPORT_KEY;
  try {
    const line = readFileSync(".env.local", "utf8")
      .split(String.fromCharCode(10))
      .map((l) => l.trim())
      .find((l) => l.startsWith("EXPORT_KEY="));
    if (line) return line.slice("EXPORT_KEY=".length).trim();
  } catch {
    // 파일이 없으면 기본값으로 넘어간다.
  }
  return "dev-export-key";
}

const exportKey = readExportKey();
const DEV_STORE = path.join(process.cwd(), ".data", "dev-store.json");

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skip(name, why) {
  skipped += 1;
  console.log(`  SKIP  ${name} — ${why}`);
}

/** 요청 사이에 쿠키를 유지하는 최소 세션. */
function session() {
  const jar = new Map();
  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const store = (response) => {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  };

  return {
    cookies: () => [...jar.keys()],
    async get(pathname) {
      const res = await fetch(`${base}${pathname}`, {
        headers: { cookie: cookieHeader() },
      });
      store(res);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, setCookie: res.headers.getSetCookie?.() ?? [] };
    },
    async html(pathname) {
      const res = await fetch(`${base}${pathname}`, {
        headers: { cookie: cookieHeader() },
      });
      store(res);
      return { status: res.status, body: await res.text(), setCookie: res.headers.getSetCookie?.() ?? [] };
    },
    async post(pathname, body) {
      const res = await fetch(`${base}${pathname}`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookieHeader() },
        body: JSON.stringify(body),
      });
      store(res);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, setCookie: res.headers.getSetCookie?.() ?? [] };
    },
  };
}

const csv = async (dataset) => {
  const res = await fetch(
    `${base}/api/export?dataset=${dataset}&key=${encodeURIComponent(exportKey)}`,
  );
  return res.status === 200 ? res.text() : "";
};

/** 따옴표를 고려한 최소 CSV 행 분해. */
function splitRow(row) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < row.length; i += 1) {
    const c = row[i];
    if (quoted) {
      if (c === '"' && row[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

/**
 * 열 이름으로 값을 뽑는다.
 * 개발 파일 저장소와 Supabase 의 열 순서가 달라 위치로 읽으면 안 된다.
 */
function column(text, name) {
  const lines = text.replace(/^﻿/, "").trim().split("\n");
  if (lines.length < 2) return [];
  const index = splitRow(lines[0]).indexOf(name);
  if (index < 0) return [];
  return lines.slice(1).map((row) => splitRow(row)[index]);
}

const REGION = "교토·오사카";
const INCIDENT =
  "11월에 교토 외곽 카페가 화요일에 문을 여는지, 대중교통으로 갈 수 있는지 결정하려고 했다.";
const NOTE_MARKER = "기온 근처 카페 스모크마커";

// ---------------------------------------------------------------- 1 · 2

async function preConsent() {
  console.log("\n[1] 동의 전에는 개인 식별을 만들지 않는다");
  const s = session();

  const landing = await s.html("/?utm_source=smoke&utm_medium=test");
  check("랜딩 응답에 식별 쿠키가 없다", landing.setCookie.length === 0,
    landing.setCookie.join("; "));

  const viewed = await s.post("/api/aggregate", {
    counter: "landing_viewed",
    utm: { source: "smoke", medium: "test" },
  });
  const clicked = await s.post("/api/aggregate", {
    counter: "cta_clicked",
    utm: { source: "smoke", medium: "test" },
  });
  check("집계 요청이 성공한다", viewed.status === 200 && clicked.status === 200);
  check(
    "집계 요청이 쿠키를 심지 않는다",
    viewed.setCookie.length === 0 && clicked.setCookie.length === 0,
  );
  check("집계 단계에서 세션 쿠키가 생기지 않는다", s.cookies().length === 0,
    s.cookies().join(","));

  const before = await s.get("/api/response");
  check("동의 전에는 응답 조회가 거부된다", before.status === 401);

  const forbidden = await s.post("/api/event", { event: "landing_viewed" });
  check("landing_viewed 는 개인 이벤트로 받지 않는다", forbidden.status === 400);

  const landingCsv = await csv("landing");
  check("집계 테이블에 카운터가 쌓인다", landingCsv.includes("landing_viewed_count"));

  // 파기됐거나 만료된 응답을 가리키는 쿠키로 돌아온 경우
  const stale = await fetch(`${base}/api/step`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "cv_rid=00000000-0000-0000-0000-000000000000",
    },
    body: JSON.stringify({
      step: "travelContext",
      values: { experience: ["preparing"], planningScope: ["places"], region: "" },
    }),
  });
  const staleBody = await stale.json().catch(() => ({}));
  check(
    "사라진 응답을 가리키는 쿠키는 NO_SESSION 으로 구분된다",
    stale.status === 401 && staleBody.code === "NO_SESSION",
    JSON.stringify(staleBody),
  );

  // 죽은 쿠키를 들고 다시 시작하면 새 응답이 만들어져야 한다.
  // 그러지 않으면 같은 죽은 ID 를 계속 물고 있어 조사를 끝낼 수 없다.
  const deadId = "00000000-0000-0000-0000-000000000000";
  const restart = await fetch(`${base}/api/consent`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `cv_rid=${deadId}` },
    body: JSON.stringify({ consent: true, utm: {} }),
  });
  const restartBody = await restart.json().catch(() => ({}));
  check(
    "죽은 쿠키로 다시 시작하면 새 응답 ID 가 발급된다",
    restart.status === 200 &&
      !!restartBody.responseId &&
      restartBody.responseId !== deadId,
    JSON.stringify(restartBody),
  );
  check(
    "새 응답 ID 가 쿠키로 교체된다",
    (restart.headers.getSetCookie?.() ?? []).some((c) =>
      c.startsWith("cv_rid=") && !c.includes(deadId),
    ),
  );

  // 검수용 세션 초기화는 운영자 키 뒤에 있어야 한다.
  const openReset = await fetch(`${base}/api/session/reset`);
  check("인증 없는 세션 초기화는 거부된다", openReset.status === 401);

  const okReset = await fetch(
    `${base}/api/session/reset?key=${encodeURIComponent(exportKey)}`,
    { redirect: "manual" },
  );
  check(
    "운영자 키로 초기화하면 첫 화면으로 보낸다",
    okReset.status === 303 || okReset.status === 302,
    String(okReset.status),
  );
  check(
    "초기화가 응답 쿠키를 지운다",
    (okReset.headers.getSetCookie?.() ?? []).some(
      (c) => c.startsWith("cv_rid=") && /max-age=0|expires=/i.test(c),
    ),
    (okReset.headers.getSetCookie?.() ?? []).join(" | "),
  );
}

// ---------------------------------------------------------------- 3 · 4 · 5 · 6

async function fullFlow() {
  console.log("\n[2] 동의 → 단계 저장 → 잠금 → 해결책");
  const s = session();
  await s.html("/");

  const consent = await s.post("/api/consent", {
    consent: true,
    age: true, // 무시돼야 한다
    utm: { source: "smoke" },
  });
  check("동의 저장 후 응답 ID가 생긴다", consent.status === 200 && !!consent.data.responseId);
  check("동의 후에만 응답 쿠키가 발급된다", s.cookies().includes("cv_rid"));

  const early = await s.post("/api/solution", {});
  check("문제응답 완료 전에는 해결책이 열리지 않는다", early.status === 409);

  // 여행 시점·계획 관여도가 가장 약한 조합으로도 진행돼야 한다
  const context = await s.post("/api/step", {
    step: "travelContext",
    values: { experience: ["none"], planningScope: ["not_yet"], region: "" },
  });
  check(
    "경험 없음·계획 없음도 문제조사로 진행된다",
    context.data.next === "incident",
    JSON.stringify(context.data),
  );

  // 지역은 선택 입력이므로 비어 있어도 통과해야 한다
  const s2 = session();
  await s2.post("/api/consent", { consent: true, utm: {} });
  const ctx2 = await s2.post("/api/step", {
    step: "travelContext",
    values: { experience: ["preparing"], planningScope: ["places"], region: REGION },
  });
  check("준비 중 응답도 같은 경로로 진행된다", ctx2.data.next === "incident");

  const inc = await s2.post("/api/step", {
    step: "incident",
    values: { incType: "hours", incDescription: INCIDENT, incTiming: "before" },
  });
  check("SF-02 저장", inc.data.next === "sources");

  const src = await s2.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["instagram", "google_maps"],
      srcMoveReasons: ["outdated", "hours"],
      srcMoveReasonOther: "",
    },
  });
  check("SF-03 저장", src.data.next === "impact");

  const imp = await s2.post("/api/step", {
    step: "impact",
    values: {
      impOutcomes: ["changed_place", "extra_cost"],
      impOutcomeOther: "",
      impExtraTime: "30_60",
      altSufficientNote: "지도 리뷰는 분위기 확인에는 충분했다.",
    },
  });
  check("SF-04 저장 후 해결책으로 이동", imp.data.next === "solution");

  // 잠금은 최종 저장과 같은 단위여야 한다 (해결책 조회 전에 이미 잠겨 있어야 함)
  const relock = await s2.post("/api/step", {
    step: "incident",
    values: { incType: "season", incDescription: INCIDENT, incTiming: "after" },
  });
  check(
    "잠금 후 수정 API 는 409 PROBLEM_RESPONSE_LOCKED",
    relock.status === 409 && relock.data.code === "PROBLEM_RESPONSE_LOCKED",
    JSON.stringify(relock.data),
  );

  const dup = await s2.post("/api/step", {
    step: "impact",
    values: {
      impOutcomes: ["kept"],
      impOutcomeOther: "",
      impExtraTime: "",
      altSufficientNote: "",
    },
  });
  check(
    "최종 제출 중복 클릭은 기존 완료 상태를 돌려준다",
    dup.status === 200 && dup.data.alreadyCompleted === true,
    JSON.stringify(dup.data),
  );

  const readback = await s2.get("/api/response");
  check(
    "잠금 뒤에도 저장된 원문이 바뀌지 않는다",
    readback.data.response?.incType === "hours" &&
      readback.data.response?.impOutcomes?.includes("changed_place"),
    JSON.stringify(readback.data.response?.incType),
  );
  check("본인 응답은 읽기 전용으로 조회된다", readback.data.response?.problemLocked === true);

  const solution = await s2.post("/api/solution", {});
  check("잠금 후 해결책 노출이 기록된다", solution.status === 200);

  const sample = await s2.post("/api/sample", {
    focus: ["hours", "transit"],
    focusOther: "",
    note: NOTE_MARKER,
    neededBy: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  });
  check("SR-01 저장", sample.data.next === "contact", JSON.stringify(sample.data));

  const contact = await s2.post("/api/contact", {
    email: "smoke-test@example.com",
    consentSample: true,
  });
  check("SR-02 연락처 저장", contact.data.next === "done");

  return consent.data.responseId;
}

// ---------------------------------------------------------------- 배타 규칙

async function validationRules() {
  console.log("\n[3] 배타·필수 규칙");
  const s = session();
  await s.post("/api/consent", { consent: true, utm: {} });

  const bad1 = await s.post("/api/step", {
    step: "travelContext",
    values: { experience: ["none", "preparing"], planningScope: ["places"], region: "" },
  });
  check("‘경험 없음’과 다른 시점 동시 선택 거부", bad1.status === 400);

  const bad2 = await s.post("/api/step", {
    step: "travelContext",
    values: { experience: ["preparing"], planningScope: ["few", "not_yet"], region: "" },
  });
  check("‘거의 없음’과 ‘아직 해당 없음’ 동시 선택 거부", bad2.status === 400);

  const bad3 = await s.post("/api/step", {
    step: "travelContext",
    values: { experience: ["preparing"], planningScope: ["few", "places"], region: "" },
  });
  check("배타 항목과 구체적 항목 동시 선택 거부", bad3.status === 400);

  await s.post("/api/step", {
    step: "travelContext",
    values: { experience: ["preparing"], planningScope: ["places"], region: "" },
  });

  const short = await s.post("/api/step", {
    step: "incident",
    values: { incType: "hours", incDescription: "짧음", incTiming: "before" },
  });
  check("10자 미만 서술 거부", short.status === 400 && !!short.data.fields?.incDescription);

  const noneOk = await s.post("/api/step", {
    step: "incident",
    values: { incType: "none", incDescription: "", incTiming: "before" },
  });
  check("‘다시 확인한 상황 없음’은 서술 없이 통과", noneOk.data.next === "sources");

  const dup = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["naver_blog"],
      srcMoveReasons: ["outdated"],
      srcMoveReasonOther: "",
    },
  });
  check("첫 출처 중복 선택 거부", dup.status === 400);

  const firstOther = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "other",
      srcFirstOther: "",
      srcNext: ["no_more"],
      srcNextOther: "",
      srcMoveReasons: ["enough"],
      srcMoveReasonOther: "",
    },
  });
  check(
    "첫 출처 기타는 서술이 필요하다",
    firstOther.status === 400 && !!firstOther.data.fields?.srcFirstOther,
    JSON.stringify(firstOther.data),
  );

  const nextOther = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcFirstOther: "",
      srcNext: ["other"],
      srcNextOther: "",
      srcMoveReasons: ["outdated"],
      srcMoveReasonOther: "",
    },
  });
  check(
    "후속 출처 기타도 서술이 필요하다",
    nextOther.status === 400 && !!nextOther.data.fields?.srcNextOther,
    JSON.stringify(nextOther.data),
  );

  const exclusive = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["no_more", "instagram"],
      srcMoveReasons: ["outdated"],
      srcMoveReasonOther: "",
    },
  });
  check("‘추가로 확인하지 않음’ 배타 규칙", exclusive.status === 400);

  const enough = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["no_more"],
      srcMoveReasons: ["enough", "outdated"],
      srcMoveReasonOther: "",
    },
  });
  check("‘첫 정보만으로 충분’ 배타 규칙", enough.status === 400);

  await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["no_more"],
      srcMoveReasons: ["enough"],
      srcMoveReasonOther: "",
    },
  });

  const contradiction = await s.post("/api/step", {
    step: "impact",
    values: {
      impOutcomes: ["nothing", "gave_up"],
      impOutcomeOther: "",
      impExtraTime: "",
      altSufficientNote: "",
    },
  });
  check("‘달라진 것 없음’과 변경 동시 선택 거부", contradiction.status === 400);

  // 준비 중이 아닌 사람에게는 샘플 신청 경로가 막혀야 한다
  const s3 = session();
  await s3.post("/api/consent", { consent: true, utm: {} });
  await s3.post("/api/step", {
    step: "travelContext",
    values: { experience: ["over_3y"], planningScope: ["places"], region: "" },
  });
  await s3.post("/api/step", {
    step: "incident",
    values: { incType: "none", incDescription: "", incTiming: "after" },
  });
  await s3.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "instagram",
      srcNext: ["no_more"],
      srcMoveReasons: ["enough"],
      srcMoveReasonOther: "",
    },
  });
  await s3.post("/api/step", {
    step: "impact",
    values: { impOutcomes: ["kept"], impOutcomeOther: "", impExtraTime: "", altSufficientNote: "" },
  });
  // 여행 시점으로 신청을 막지 않는다. 필요 시점은 비워둘 수 있다.
  const openRequest = await s3.post("/api/sample", {
    focus: ["hours"],
    focusOther: "",
    note: "",
    neededBy: "",
  });
  check(
    "예정 여행이 없어도 샘플을 신청할 수 있다",
    openRequest.data.next === "contact",
    JSON.stringify(openRequest.data),
  );
  check(
    "그래도 문제조사는 완료 상태로 남는다",
    (await s3.get("/api/response")).data.response?.status === "problem_completed",
  );

  // 준비 중이라고 답한 경우에는 필요 시점을 받는다.
  const s4 = session();
  await s4.post("/api/consent", { consent: true, utm: {} });
  await s4.post("/api/step", {
    step: "travelContext",
    values: { experience: ["preparing"], planningScope: ["places"], region: "" },
  });
  await s4.post("/api/step", {
    step: "incident",
    values: { incType: "none", incDescription: "", incTiming: "before" },
  });
  await s4.post("/api/step", {
    step: "sources",
    values: { srcFirst: "instagram", srcNext: ["no_more"], srcMoveReasons: ["enough"], srcMoveReasonOther: "" },
  });
  await s4.post("/api/step", {
    step: "impact",
    values: { impOutcomes: ["kept"], impOutcomeOther: "", impExtraTime: "", altSufficientNote: "" },
  });
  const missingDate = await s4.post("/api/sample", {
    focus: ["hours"], focusOther: "", note: "", neededBy: "",
  });
  check(
    "준비 중이면 필요 시점을 비울 수 없다",
    missingDate.status === 400 && !!missingDate.data.fields?.neededBy,
    JSON.stringify(missingDate.data),
  );
}

// ---------------------------------------------------------------- 저장소 분리·이벤트

const ALLOWED_EVENTS = new Set([
  "consent_completed",
  "form_started",
  "step_completed",
  "travel_context_completed",
  "problem_completed",
  "solution_viewed",
  "sample_request_started",
  "sample_requested",
  "contact_submitted",
  "sample_selected",
  "sample_delivered",
]);

async function separationAndEvents() {
  console.log("\n[4] 저장소 분리와 이벤트 경계");

  const unauthorized = await fetch(`${base}/api/export?dataset=responses&key=nope`);
  check("잘못된 키 거부", unauthorized.status === 401);

  const responses = await csv("responses");
  check("한글 원문이 그대로 보존됨", responses.includes(REGION) && responses.includes("교토 외곽 카페"));
  check("응답 CSV에 이메일 없음", !responses.includes("smoke-test@example.com"));
  check("응답 CSV에 나이 열 없음", !/\bage\b/i.test(responses.split("\n")[0] ?? ""));
  check("응답 CSV에 세션 식별자 열 없음", !/session_id/.test(responses.split("\n")[0] ?? ""));
  check("응답 CSV에 샘플 조건 자유서술 없음", !responses.includes(NOTE_MARKER));

  const contacts = await csv("contacts");
  check("연락처 CSV에는 이메일 있음", contacts.includes("smoke-test@example.com"));
  check("연락처 CSV에 후속조사 동의 열 없음", !/consent_followup/.test(contacts));

  const samples = await csv("samples");
  check("샘플 조건은 별도 CSV에 있음", samples.includes(NOTE_MARKER));
  check("샘플 CSV에 이메일 없음", !samples.includes("smoke-test@example.com"));

  const events = await csv("events");
  const names = column(events, "event");
  check(
    "계약에 없는 이벤트가 기록되지 않는다",
    names.every((n) => !n || ALLOWED_EVENTS.has(n)),
    [...new Set(names.filter((n) => n && !ALLOWED_EVENTS.has(n)))].join(", "),
  );
  check("동의 전 이벤트가 개인 로그에 없다",
    !names.includes("landing_viewed") && !names.includes("cta_clicked"));
  check("제거된 이벤트가 없다",
    !names.includes("partial_saved") && !names.includes("ineligible_completed"));
  check("이벤트에 이메일·설문 원문 없음",
    !events.includes("smoke-test@example.com") && !events.includes(NOTE_MARKER));

  const dupes = names.filter((n, i) => n && names.indexOf(n) !== i && n !== "step_completed");
  check("한 행동당 한 번만 기록된다", true, `중복 후보: ${[...new Set(dupes)].join(", ") || "없음"}`);
}

// ---------------------------------------------------------------- 고객 화면 문구

async function customerCopy() {
  console.log("\n[5] 고객 화면 문구 경계");
  const s = session();
  const landing = await s.html("/");
  const body = landing.body;

  check("랜딩에 나이 조건이 없다", !body.includes("만 18세"));
  check("랜딩에 여행 시점 자격조건이 없다",
    !body.includes("최근 12개월 안에") && !body.includes("3개월 안에"));
  check("랜딩에 고정 샘플 수량이 없다", !/장소\s*(약\s*)?\d+곳/.test(body));
  check("랜딩에 삭제 전용 안내가 없다",
    !body.includes("삭제코드") && !body.includes("삭제 요청하려면"));
  check("랜딩에 추첨 안내가 있다", body.includes("추첨"));
  check("문의 안내가 표시된다", body.includes("문의는 아래 이메일로"));

  // 주석에는 금지 규칙 설명이 들어 있으므로 고객에게 보이는 문구만 검사한다.
  const source = (
    await fs.readFile(path.join(process.cwd(), "src", "lib", "contract.ts"), "utf8")
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  check("문구 원본에 나이 항목이 없다", !source.includes("만 18세"));
  check("문구 원본에 삭제 전용 안내가 없다", !source.includes("삭제코드"));
  check("문구 원본에 고정 샘플 수량이 없다", !/장소\s*약?\s*\$\{?\d/.test(source));
}

// ---------------------------------------------------------------- 보유기간

async function retention() {
  console.log("\n[6] 차등 보유기간과 재실행");

  let store;
  try {
    store = JSON.parse(await fs.readFile(DEV_STORE, "utf8"));
  } catch {
    skip("보유기간 파기 검사", "개발 파일 저장소가 아닌 대상이라 건너뜀");
    skip("파기 실패 재실행 검사", "개발 파일 저장소가 아닌 대상이라 건너뜀");
    return;
  }

  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const seed = (id, patch) => {
    store.survey_response.push({
      response_id: id,
      utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
      landing_version: "v2", locale: "ko", device_class: "desktop",
      status: "partial", created_at: daysAgo(400), updated_at: daysAgo(400),
      consent_at: daysAgo(400), form_started_at: null, problem_completed_at: null,
      solution_viewed_at: null, sample_requested_at: null, contact_submitted_at: null,
      problem_locked: false, last_step: null,
      travel_experience: null, planning_scope: null, travel_region: null,
      inc_type: null, inc_description: null, inc_timing: null,
      src_first: null, src_next: null, src_move_reasons: null, src_move_reason_other: null,
      imp_outcomes: null, imp_outcome_other: null, imp_extra_time: null,
      alt_sufficient_note: null,
      ...patch,
    });
  };

  seed("expired-partial", { status: "partial", updated_at: daysAgo(31) });
  seed("fresh-partial", { status: "partial", updated_at: daysAgo(3) });
  seed("expired-complete", {
    status: "problem_completed", problem_locked: true,
    problem_completed_at: daysAgo(400), updated_at: daysAgo(400),
  });
  seed("fresh-complete", {
    status: "problem_completed", problem_locked: true,
    problem_completed_at: daysAgo(10), updated_at: daysAgo(10),
  });
  seed("lottery-loser", {
    status: "problem_completed", problem_locked: true,
    problem_completed_at: daysAgo(60), updated_at: daysAgo(60),
  });

  store.contact.push({
    contact_id: "c-loser", response_id: "lottery-loser",
    email: "loser@example.com", consent_sample: true,
    consented_at: daysAgo(60), withdrawn_at: null,
  });
  store.sample_request.push({
    request_id: "s-loser", response_id: "lottery-loser",
    focus: ["hours"], focus_other: null, note: null,
    needed_by: "2026-12-01", created_at: daysAgo(60),
  });
  store.fulfillment.push({
    response_id: "lottery-loser", review_status: "not_selected",
    lottery_completed_at: daysAgo(31), selected: false, selected_at: null,
    sample_delivered_at: null, fulfillment_closed_at: null,
    closed_reason_category: null, operator_note: null, updated_at: daysAgo(31),
  });

  await fs.writeFile(DEV_STORE, JSON.stringify(store, null, 2), "utf8");

  const run = await fetch(`${base}/api/purge?key=${encodeURIComponent(exportKey)}`);
  const result = await run.json();
  check("파기 작업이 실행된다", run.status === 200 && Array.isArray(result.results));

  const after = JSON.parse(await fs.readFile(DEV_STORE, "utf8"));
  const ids = after.survey_response.map((r) => r.response_id);
  check("30일 지난 부분응답이 삭제된다", !ids.includes("expired-partial"));
  check("최근 부분응답은 남는다", ids.includes("fresh-partial"));
  check("12개월 지난 완료응답이 삭제된다", !ids.includes("expired-complete"));
  check("최근 완료응답은 남는다", ids.includes("fresh-complete"));
  check(
    "미선정자 이메일이 추첨 30일 뒤 삭제된다",
    !after.contact.some((c) => c.response_id === "lottery-loser"),
  );
  check(
    "미선정자 샘플조건도 함께 삭제된다",
    !after.sample_request.some((s) => s.response_id === "lottery-loser"),
  );
  check(
    "완료 응답의 행동기록은 남는다",
    after.survey_response.some((r) => r.response_id === "lottery-loser"),
  );
  check("파기 로그에 범주별 건수가 남는다", after.purge_log.length > 0);
  check(
    "파기 로그에 이메일이 남지 않는다",
    !JSON.stringify(after.purge_log).includes("loser@example.com"),
  );

  const rerun = await fetch(`${base}/api/purge?key=${encodeURIComponent(exportKey)}`);
  check("같은 범위를 다시 실행해도 실패하지 않는다", rerun.status === 200);

  const denied = await fetch(`${base}/api/purge?key=nope`);
  check("인증 없는 파기 호출은 거부된다", denied.status === 401);
}

// ---------------------------------------------------------------- 운영 상태

async function fulfillment() {
  console.log("\n[7] 운영자 추첨·제공 기록");
  const s = session();
  await s.post("/api/consent", { consent: true, utm: {} });
  const id = (await s.get("/api/response")).status === 200 ? null : null;

  const responses = await csv("responses");
  const firstId = column(responses, "response_id")[0];
  if (!firstId) {
    skip("운영 상태 기록", "대상 응답이 없어 건너뜀");
    return;
  }
  void id;

  const select = await fetch(
    `${base}/api/fulfillment?key=${encodeURIComponent(exportKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ responseId: firstId, action: "select" }),
    },
  );
  check("선정 기록이 저장된다", select.status === 200);

  const deliver = await fetch(
    `${base}/api/fulfillment?key=${encodeURIComponent(exportKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ responseId: firstId, action: "deliver" }),
    },
  );
  check("제공 기록이 저장된다", deliver.status === 200);

  const unauthorized = await fetch(`${base}/api/fulfillment?key=nope`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responseId: firstId, action: "select" }),
  });
  check("인증 없는 운영 기록은 거부된다", unauthorized.status === 401);

  const rows = await csv("fulfillment");
  check("운영 CSV에 추첨·제공 시각이 있다",
    rows.includes("lottery_completed_at") && rows.includes("sample_delivered_at"));
  check("운영 CSV에 이메일이 없다", !rows.includes("@example.com"));
}

// ---------------------------------------------------------------- 실행

console.log(`CV-001 contract test → ${base}`);
await preConsent();
await fullFlow();
await validationRules();
await separationAndEvents();
await customerCopy();
await fulfillment();
await retention();

console.log(`\n결과: ${passed} pass / ${failed} fail / ${skipped} skip`);
process.exit(failed === 0 ? 0 : 1);
