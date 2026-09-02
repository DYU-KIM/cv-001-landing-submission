/**
 * CV-001 스키마·마이그레이션을 실제 Postgres 엔진(PGlite)에서 검증한다.
 *
 *   A) 신규 설치 경로: supabase/schema.sql 을 빈 DB에 적용
 *   B) 개정 경로: 2026-09-01 스키마 → 데이터 주입 → 마이그레이션 → 새 purge_expired()
 *
 * Supabase 에서 돌리기 전에 문법과 데이터 보존을 미리 확인하기 위한 것이다.
 */

import { PGlite } from "@electric-sql/pglite";
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = process.cwd();

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

const read = (p) => fs.readFile(`${REPO}/${p}`, "utf8");

/** pgcrypto 확장은 PGlite 에 없다. gen_random_uuid 는 PG13+ 코어에 있으므로 그 줄만 제거한다. */
const stripPgcrypto = (sql) =>
  sql.replace(/create extension if not exists "pgcrypto";/g, "");

async function run(db, sql, label) {
  try {
    await db.exec(sql);
    return null;
  } catch (error) {
    console.log(`\n  !! ${label} 실행 중 오류:\n     ${error.message}\n`);
    return error;
  }
}

// ---------------------------------------------------------------- A. 신규 설치

console.log("\n[A] 신규 프로젝트 경로 — schema.sql 을 빈 DB에 적용");
{
  const db = new PGlite();
  const schema = stripPgcrypto(await read("supabase/schema.sql"));
  const err = await run(db, schema, "schema.sql");
  check("schema.sql 이 오류 없이 실행된다", !err, err?.message);

  if (!err) {
    const tables = await db.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' order by table_name`,
    );
    const names = tables.rows.map((r) => r.table_name);
    check(
      "테이블 7개가 만들어진다",
      [
        "contact",
        "event_log",
        "fulfillment",
        "landing_aggregate",
        "purge_log",
        "sample_request",
        "survey_response",
      ].every((t) => names.includes(t)),
      names.join(", "),
    );

    const fns = await db.query(
      `select routine_name from information_schema.routines
        where routine_schema = 'public' order by routine_name`,
    );
    const fnNames = fns.rows.map((r) => r.routine_name);
    check(
      "함수 3개가 만들어진다",
      ["bump_landing_counter", "purge_expired", "touch_updated_at"].every((f) =>
        fnNames.includes(f),
      ),
      fnNames.join(", "),
    );

    // 집계 함수 동작
    await db.exec(`
      select bump_landing_counter(current_date,'ig','organic','cv','','v2','ko','mobile','landing_viewed_count');
      select bump_landing_counter(current_date,'ig','organic','cv','','v2','ko','mobile','landing_viewed_count');
      select bump_landing_counter(current_date,'ig','organic','cv','','v2','ko','mobile','cta_clicked_count');
    `);
    const agg = await db.query(`select * from landing_aggregate`);
    check(
      "집계 함수가 같은 키를 누적한다",
      agg.rows.length === 1 &&
        Number(agg.rows[0].landing_viewed_count) === 2 &&
        Number(agg.rows[0].cta_clicked_count) === 1,
      JSON.stringify(agg.rows),
    );

    let guarded = false;
    try {
      await db.exec(
        `select bump_landing_counter(current_date,'','','','','v2','ko','mobile','drop_table')`,
      );
    } catch {
      guarded = true;
    }
    check("허용되지 않은 카운터 열은 거부된다", guarded);

    // updated_at 트리거
    await db.exec(
      `insert into survey_response (response_id, status) values ('11111111-1111-1111-1111-111111111111','consented')`,
    );
    const before = await db.query(
      `select updated_at from survey_response where response_id='11111111-1111-1111-1111-111111111111'`,
    );
    await db.exec(
      `update survey_response set last_step='incident' where response_id='11111111-1111-1111-1111-111111111111'`,
    );
    const after = await db.query(
      `select updated_at from survey_response where response_id='11111111-1111-1111-1111-111111111111'`,
    );
    check(
      "updated_at 트리거가 갱신된다",
      new Date(after.rows[0].updated_at) >= new Date(before.rows[0].updated_at),
    );

    // 차등 파기
    await db.exec(`
      insert into survey_response (response_id, status, updated_at)
        values ('22222222-2222-2222-2222-222222222222','partial', now() - interval '31 days');
      insert into survey_response (response_id, status, problem_completed_at, problem_locked)
        values ('33333333-3333-3333-3333-333333333333','problem_completed', now() - interval '400 days', true);
      insert into survey_response (response_id, status, problem_completed_at, problem_locked)
        values ('44444444-4444-4444-4444-444444444444','problem_completed', now() - interval '10 days', true);
      insert into contact (response_id, email, consent_sample)
        values ('44444444-4444-4444-4444-444444444444','loser@example.com', true);
      insert into sample_request (response_id, focus, needed_by)
        values ('44444444-4444-4444-4444-444444444444', array['hours'], current_date + 30);
      insert into fulfillment (response_id, review_status, lottery_completed_at, selected)
        values ('44444444-4444-4444-4444-444444444444','not_selected', now() - interval '31 days', false);
    `);
    // 트리거가 updated_at 을 now() 로 덮으므로 부분응답 기준일을 다시 눌러준다
    await db.exec(`
      alter table survey_response disable trigger survey_response_touch;
      update survey_response set updated_at = now() - interval '31 days'
       where response_id = '22222222-2222-2222-2222-222222222222';
      alter table survey_response enable trigger survey_response_touch;
    `);

    const purge = await db.query(`select * from purge_expired()`);
    check("purge_expired() 가 5개 범주를 반환한다", purge.rows.length === 5,
      JSON.stringify(purge.rows));

    const left = await db.query(
      `select response_id from survey_response order by response_id`,
    );
    const ids = left.rows.map((r) => r.response_id);
    check("30일 지난 부분응답이 삭제된다",
      !ids.includes("22222222-2222-2222-2222-222222222222"));
    check("12개월 지난 완료응답이 삭제된다",
      !ids.includes("33333333-3333-3333-3333-333333333333"));
    check("최근 완료응답은 남는다",
      ids.includes("44444444-4444-4444-4444-444444444444"));

    const contacts = await db.query(`select * from contact`);
    check("미선정자 이메일이 삭제된다", contacts.rows.length === 0,
      JSON.stringify(contacts.rows));
    const samples = await db.query(`select * from sample_request`);
    check("미선정자 샘플조건이 삭제된다", samples.rows.length === 0);

    const log = await db.query(`select category, deleted from purge_log order by id`);
    check("파기 로그에 범주별 건수가 남는다", log.rows.length === 5,
      JSON.stringify(log.rows));

    const rerun = await db.query(`select * from purge_expired()`);
    check("재실행해도 오류 없이 끝난다", rerun.rows.length === 5);
  }
  await db.close();
}

// ---------------------------------------------------------------- B. 개정 경로

console.log("\n[B] 기존 프로젝트 경로 — 09-01 스키마 → 마이그레이션");
{
  const oldSchema = stripPgcrypto(
    execFileSync("git", ["show", "bb597f3^:supabase/schema.sql"], {
      cwd: REPO,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    }),
  );

  const db = new PGlite();
  const err1 = await run(db, oldSchema, "09-01 schema.sql");
  check("09-01 스키마가 적용된다", !err1, err1?.message);

  // 실제 Supabase 에 있을 법한 데이터를 넣는다
  await db.exec(`
    insert into survey_response
      (response_id, session_id, status, elig_status, elig_scope, elig_region,
       inc_type, inc_description, inc_timing, problem_completed_at, problem_locked)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001','sess-1','problem_completed',
       'planning', array['places','food'], '교토',
       'hours', '11월 교토 외곽 카페 영업일을 확인하려 했다', 'before', now(), true),
      ('aaaaaaaa-0000-0000-0000-000000000002','sess-2','ineligible',
       'none', array['none'], '도쿄', null, null, null, null, false),
      ('aaaaaaaa-0000-0000-0000-000000000003','sess-3','partial',
       'both', array['transit'], '오사카', null, null, null, null, false);

    insert into contact (response_id, email, consent_sample, consent_followup)
      values ('aaaaaaaa-0000-0000-0000-000000000001','tester@example.com', true, true);

    insert into event_log (session_id, response_id, event, dedupe_key)
      values ('sess-1','aaaaaaaa-0000-0000-0000-000000000001','consent_completed','k1'),
             ('sess-1','aaaaaaaa-0000-0000-0000-000000000001','problem_completed','k2'),
             ('sess-1', null, 'landing_viewed','k3'),
             ('sess-1', null, 'cta_clicked','k4'),
             ('sess-1','aaaaaaaa-0000-0000-0000-000000000001','sample_used','k5');
  `);

  const migration = await read("supabase/migrations/2026-09-02-cv001-revision.sql");
  const err2 = await run(db, migration, "마이그레이션");
  check("마이그레이션이 오류 없이 실행된다", !err2, err2?.message);

  if (!err2) {
    // 마이그레이션 뒤 새 purge_expired() 를 얹는다 (파일 주석의 지시대로)
    const newSchema = stripPgcrypto(await read("supabase/schema.sql"));
    const purgeFn = newSchema.slice(newSchema.indexOf("create or replace function purge_expired()"));
    const err3 = await run(db, purgeFn, "새 purge_expired()");
    check("새 purge_expired() 가 얹힌다", !err3, err3?.message);

    const cols = await db.query(
      `select column_name from information_schema.columns
        where table_name = 'survey_response' order by column_name`,
    );
    const colNames = cols.rows.map((r) => r.column_name);
    check("travel_experience 열이 생긴다", colNames.includes("travel_experience"));
    check("planning_scope 로 이름이 바뀐다", colNames.includes("planning_scope"));
    check("travel_region 으로 이름이 바뀐다", colNames.includes("travel_region"));
    check("session_id 가 사라진다", !colNames.includes("session_id"));
    check("ineligible_reason 이 사라진다", !colNames.includes("ineligible_reason"));
    check("updated_at 이 생긴다", colNames.includes("updated_at"));

    const migrated = await db.query(
      `select response_id, status, travel_experience, planning_scope, travel_region,
              inc_description
         from survey_response order by response_id`,
    );
    const first = migrated.rows[0];
    check(
      "planning 이 preparing 으로 변환된다",
      Array.isArray(first.travel_experience) &&
        first.travel_experience.includes("preparing"),
      JSON.stringify(first.travel_experience),
    );
    check(
      "both 가 두 값으로 변환된다",
      migrated.rows[2].travel_experience?.length === 2,
      JSON.stringify(migrated.rows[2].travel_experience),
    );
    check(
      "기존 설문 원문이 보존된다",
      first.inc_description?.includes("교토 외곽 카페"),
      first.inc_description,
    );
    check(
      "지역 값이 보존된다",
      first.travel_region === "교토",
      first.travel_region,
    );
    check(
      "ineligible 상태가 partial 로 바뀐다",
      migrated.rows[1].status === "partial",
      migrated.rows[1].status,
    );

    const contactCols = await db.query(
      `select column_name from information_schema.columns where table_name='contact'`,
    );
    check(
      "consent_followup 열이 사라진다",
      !contactCols.rows.some((r) => r.column_name === "consent_followup"),
    );
    const contactRows = await db.query(`select email from contact`);
    check("연락처 데이터는 보존된다", contactRows.rows.length === 1);

    const events = await db.query(`select event from event_log order by event`);
    const eventNames = events.rows.map((r) => r.event);
    check(
      "계약에서 삭제된 이벤트가 제거된다",
      !eventNames.includes("landing_viewed") &&
        !eventNames.includes("cta_clicked") &&
        !eventNames.includes("sample_used"),
      eventNames.join(", "),
    );
    check(
      "유효한 이벤트는 남는다",
      eventNames.includes("consent_completed") &&
        eventNames.includes("problem_completed"),
      eventNames.join(", "),
    );

    const fCols = await db.query(
      `select column_name from information_schema.columns where table_name='fulfillment'`,
    );
    const fNames = fCols.rows.map((r) => r.column_name);
    check(
      "fulfillment 에 추첨·제공·종료 열이 생긴다",
      ["lottery_completed_at", "selected", "sample_delivered_at", "fulfillment_closed_at",
       "closed_reason_category"].every((c) => fNames.includes(c)),
      fNames.join(", "),
    );

    const tables = await db.query(
      `select table_name from information_schema.tables where table_schema='public'`,
    );
    const tNames = tables.rows.map((r) => r.table_name);
    check("landing_aggregate 가 생긴다", tNames.includes("landing_aggregate"));
    check("purge_log 가 생긴다", tNames.includes("purge_log"));

    const purge = await db.query(`select * from purge_expired()`);
    check("마이그레이션 뒤 파기 함수가 동작한다", purge.rows.length === 5);
  }

  await db.close();
}

console.log(`\n결과: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
