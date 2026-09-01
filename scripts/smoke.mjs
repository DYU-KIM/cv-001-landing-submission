/**
 * CV-001 랜딩·설문 동작 검증.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * 확인하는 것:
 *   1. 문제 응답 → 해결책 공개 → 샘플 요청 → 연락처 저장까지의 정상 흐름
 *   2. 한글 원문이 깨지지 않고 저장·내보내기되는지
 *   3. 해결책 공개 후 문제 답변 잠금 (D-LOCK-01)
 *   4. 부적격 종료 분기와 배타 선택 규칙
 *   5. 이메일이 문제 응답 CSV에 섞이지 않는지
 *
 * EXPORT_KEY 가 있으면 CSV 검증까지 수행한다.
 */

const base = process.argv[2] ?? "http://localhost:3000";
const exportKey = process.env.EXPORT_KEY ?? "dev-export-key";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** 요청 사이에 쿠키를 유지하는 최소 세션. */
function session() {
  const jar = new Map();
  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const store = (response) => {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };

  return {
    async get(path) {
      const res = await fetch(`${base}${path}`, {
        headers: { cookie: cookieHeader() },
      });
      store(res);
      return res;
    },
    async post(path, body) {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookieHeader() },
        body: JSON.stringify(body),
      });
      store(res);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    },
  };
}

const REGION = "교토·오사카";
const INCIDENT =
  "11월에 교토 외곽 카페가 화요일에 문을 여는지, 대중교통으로 갈 수 있는지 결정하려고 했다.";

async function happyPath() {
  console.log("\n[1] 정상 흐름 — 여행 예정자");
  const s = session();
  await s.get("/?utm_source=instagram&utm_medium=organic&utm_campaign=cv001");

  await s.post("/api/event", { event: "landing_viewed" });
  await s.post("/api/event", { event: "cta_clicked" });

  const consent = await s.post("/api/consent", { consent: true, age: true });
  check("동의 저장", consent.status === 200 && consent.data.responseId);

  const elig = await s.post("/api/step", {
    step: "eligibility",
    values: {
      eligStatus: "planning",
      eligScope: ["places", "food", "transit"],
      eligRegion: REGION,
    },
  });
  check("SF-01 저장", elig.data.next === "incident", JSON.stringify(elig.data));

  const inc = await s.post("/api/step", {
    step: "incident",
    values: { incType: "hours", incDescription: INCIDENT, incTiming: "before" },
  });
  check("SF-02 저장", inc.data.next === "sources", JSON.stringify(inc.data));

  const src = await s.post("/api/step", {
    step: "sources",
    values: {
      srcFirst: "naver_blog",
      srcNext: ["instagram", "google_maps"],
      srcMoveReasons: ["outdated", "hours"],
      srcMoveReasonOther: "",
    },
  });
  check("SF-03 저장", src.data.next === "impact", JSON.stringify(src.data));

  const imp = await s.post("/api/step", {
    step: "impact",
    values: {
      impOutcomes: ["changed_place", "extra_cost"],
      impOutcomeOther: "",
      impExtraTime: "30_60",
      altSufficientNote: "지도 리뷰는 분위기 확인에는 충분했다.",
    },
  });
  check("SF-04 저장 후 해결책으로 이동", imp.data.next === "solution");

  const solution = await s.post("/api/solution", {});
  check("SO-01 노출 기록", solution.status === 200);

  const relock = await s.post("/api/step", {
    step: "incident",
    values: { incType: "season", incDescription: INCIDENT, incTiming: "before" },
  });
  check("해결책 공개 후 문제 답변 잠금 (D-LOCK-01)", relock.status === 409);

  const sample = await s.post("/api/sample", {
    focus: ["hours", "transit"],
    focusOther: "",
    note: "기온 근처 카페를 고민 중이다.",
    neededBy: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  });
  check("SR-01 저장", sample.data.next === "contact", JSON.stringify(sample.data));

  const contact = await s.post("/api/contact", {
    email: "smoke-test@example.com",
    consentSample: true,
    consentFollowup: true,
  });
  check("SR-02 연락처 저장", contact.data.next === "done");

  return consent.data.responseId;
}

async function ineligiblePath() {
  console.log("\n[2] 부적격 종료 분기");
  const s = session();
  await s.get("/");
  await s.post("/api/consent", { consent: true, age: true });

  const out = await s.post("/api/step", {
    step: "eligibility",
    values: { eligStatus: "none", eligScope: ["places"], eligRegion: "도쿄" },
  });
  check("대상 기간 밖이면 종료", out.data.next === "ineligible");

  const s2 = session();
  await s2.get("/");
  await s2.post("/api/consent", { consent: true, age: true });
  const out2 = await s2.post("/api/step", {
    step: "eligibility",
    values: { eligStatus: "recent", eligScope: ["none"], eligRegion: "도쿄" },
  });
  check("직접 정한 것이 없으면 종료", out2.data.next === "ineligible");

  const blocked = await s2.post("/api/sample", {
    focus: ["hours"],
    focusOther: "",
    note: "",
    neededBy: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
  });
  check("부적격자는 샘플 요청 불가", blocked.status === 409 || blocked.status === 403);
}

async function validationRules() {
  console.log("\n[3] 배타·필수 규칙");
  const s = session();
  await s.get("/");
  await s.post("/api/consent", { consent: true, age: true });
  await s.post("/api/step", {
    step: "eligibility",
    values: { eligStatus: "both", eligScope: ["places"], eligRegion: "삿포로" },
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
}

async function exportChecks() {
  console.log("\n[4] CSV 내보내기와 저장소 분리");
  const unauthorized = await fetch(`${base}/api/export?dataset=responses&key=nope`);
  check("잘못된 키 거부", unauthorized.status === 401);

  const res = await fetch(
    `${base}/api/export?dataset=responses&key=${encodeURIComponent(exportKey)}`,
  );
  if (res.status !== 200) {
    check("응답 CSV 내보내기", false, `status ${res.status}`);
    return;
  }
  const csv = await res.text();
  check("한글 원문이 그대로 보존됨", csv.includes(REGION) && csv.includes("교토 외곽 카페"));
  check("응답 CSV에 이메일 없음", !csv.includes("smoke-test@example.com"));

  const contacts = await (
    await fetch(`${base}/api/export?dataset=contacts&key=${encodeURIComponent(exportKey)}`)
  ).text();
  check("연락처 CSV에는 이메일 있음", contacts.includes("smoke-test@example.com"));

  const events = await (
    await fetch(`${base}/api/export?dataset=events&key=${encodeURIComponent(exportKey)}`)
  ).text();
  const rows = events.trim().split("\n").slice(1);
  const names = rows.map((r) => r.split(",")[2]);
  const funnel = [
    "landing_viewed",
    "cta_clicked",
    "consent_completed",
    "problem_completed",
    "solution_viewed",
    "sample_requested",
    "contact_submitted",
  ];
  check(
    "퍼널 이벤트가 모두 기록됨",
    funnel.every((e) => names.includes(e)),
    funnel.filter((e) => !names.includes(e)).join(", "),
  );
  check("이벤트에 이메일·설문 원문 없음", !events.includes("smoke-test@example.com"));
}

console.log(`CV-001 smoke test → ${base}`);
await happyPath();
await ineligiblePath();
await validationRules();
await exportChecks();

console.log(`\n결과: ${passed} pass / ${failed} fail`);
process.exit(failed === 0 ? 0 : 1);
