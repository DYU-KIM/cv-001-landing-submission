/**
 * 저장소 접근 계층.
 *
 * 운영: Supabase Postgres (service role 키를 서버에서만 사용)
 * 개발: SUPABASE 환경변수가 없으면 .data/dev-store.json 파일 저장소로 대체한다.
 *       스키마와 규칙은 같고, 실제 배포에는 사용하지 않는다.
 *
 * 여기서만 DB에 접근한다. 화면·라우트가 직접 Supabase 클라이언트를 만들지 않는다.
 *
 * 동의 전 측정은 landing_aggregate 집계만 건드리고 개인 연결키를 만들지 않는다. (Q-053)
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ResponseStatus = "consented" | "partial" | "problem_completed";

export type Utm = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
};

export type SurveyResponse = {
  response_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_version: string;
  locale: string;
  device_class: string | null;
  status: ResponseStatus;
  created_at: string;
  updated_at: string;
  consent_at: string | null;
  form_started_at: string | null;
  problem_completed_at: string | null;
  solution_viewed_at: string | null;
  sample_requested_at: string | null;
  contact_submitted_at: string | null;
  problem_locked: boolean;
  last_step: string | null;
  travel_experience: string[] | null;
  planning_scope: string[] | null;
  travel_region: string | null;
  inc_type: string | null;
  inc_description: string | null;
  inc_timing: string | null;
  src_first: string | null;
  src_first_other: string | null;
  src_next: string[] | null;
  src_next_other: string | null;
  src_move_reasons: string[] | null;
  src_move_reason_other: string | null;
  imp_outcomes: string[] | null;
  imp_outcome_other: string | null;
  imp_extra_time: string | null;
  alt_sufficient_note: string | null;
};

export type SampleRequestRow = {
  request_id: string;
  response_id: string;
  focus: string[];
  focus_other: string | null;
  note: string | null;
  needed_by: string | null;
  created_at: string;
};

export type ContactRow = {
  contact_id: string;
  response_id: string;
  email: string;
  consent_sample: boolean;
  consented_at: string;
  withdrawn_at: string | null;
};

export type FulfillmentRow = {
  response_id: string;
  review_status: "pending" | "not_selected" | "selected" | "delivered" | "closed";
  lottery_completed_at: string | null;
  selected: boolean | null;
  selected_at: string | null;
  sample_delivered_at: string | null;
  fulfillment_closed_at: string | null;
  closed_reason_category: string | null;
  operator_note: string | null;
  updated_at: string;
};

export type EventRow = {
  response_id: string;
  event: string;
  step: string | null;
  occurred_at: string;
  params: Record<string, unknown>;
  dedupe_key: string;
};

export type LandingAggregateRow = {
  event_date: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  landing_version: string;
  locale: string;
  device_class: string;
  landing_viewed_count: number;
  cta_clicked_count: number;
};

export type PurgeLogRow = {
  ran_at: string;
  category: string;
  deleted: number;
  failed: number;
  error_detail: string | null;
};

// --------------------------------------------------------------- supabase

let cached: SupabaseClient | null = null;

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isDevStore(): boolean {
  return supabase() === null;
}

// --------------------------------------------------------------- dev store

type DevData = {
  landing_aggregate: LandingAggregateRow[];
  survey_response: SurveyResponse[];
  sample_request: SampleRequestRow[];
  contact: ContactRow[];
  fulfillment: FulfillmentRow[];
  event_log: EventRow[];
  purge_log: PurgeLogRow[];
};

const EMPTY_DEV: DevData = {
  landing_aggregate: [],
  survey_response: [],
  sample_request: [],
  contact: [],
  fulfillment: [],
  event_log: [],
  purge_log: [],
};

const DEV_FILE = path.join(process.cwd(), ".data", "dev-store.json");
let devWrite: Promise<void> = Promise.resolve();

async function readDev(): Promise<DevData> {
  try {
    const parsed = JSON.parse(await fs.readFile(DEV_FILE, "utf8")) as Partial<DevData>;
    return { ...EMPTY_DEV, ...parsed };
  } catch {
    return { ...EMPTY_DEV };
  }
}

/** 개발 저장소 쓰기를 직렬화해 동시 요청이 서로를 덮어쓰지 않게 한다. */
async function mutateDev<T>(fn: (data: DevData) => T | Promise<T>): Promise<T> {
  let result!: T;
  devWrite = devWrite.then(async () => {
    const data = await readDev();
    result = await fn(data);
    await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
    await fs.writeFile(DEV_FILE, JSON.stringify(data, null, 2), "utf8");
  });
  await devWrite;
  return result;
}

// ------------------------------------------------- 동의 전 집계 (개인 식별 없음)

export type LandingCounter = "landing_viewed_count" | "cta_clicked_count";

export type LandingAggregateKey = {
  utm: Utm;
  landingVersion: string;
  locale: string;
  deviceClass: string;
};

export async function bumpLandingCounter(
  key: LandingAggregateKey,
  column: LandingCounter,
): Promise<void> {
  const eventDate = new Date().toISOString().slice(0, 10);
  const k = {
    event_date: eventDate,
    utm_source: key.utm.source ?? "",
    utm_medium: key.utm.medium ?? "",
    utm_campaign: key.utm.campaign ?? "",
    utm_content: key.utm.content ?? "",
    landing_version: key.landingVersion,
    locale: key.locale,
    device_class: key.deviceClass,
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => {
      const row = data.landing_aggregate.find((r) =>
        (Object.keys(k) as (keyof typeof k)[]).every((f) => r[f] === k[f]),
      );
      if (row) row[column] += 1;
      else
        data.landing_aggregate.push({
          ...k,
          landing_viewed_count: column === "landing_viewed_count" ? 1 : 0,
          cta_clicked_count: column === "cta_clicked_count" ? 1 : 0,
        });
    });
    return;
  }

  const { error } = await db.rpc("bump_landing_counter", {
    p_event_date: k.event_date,
    p_utm_source: k.utm_source,
    p_utm_medium: k.utm_medium,
    p_utm_campaign: k.utm_campaign,
    p_utm_content: k.utm_content,
    p_landing_version: k.landing_version,
    p_locale: k.locale,
    p_device_class: k.device_class,
    p_column: column,
  });
  if (error) throw new Error(`bumpLandingCounter: ${error.message}`);
}

// --------------------------------------------------------------- responses

export type CreateResponseInput = {
  utm: Utm;
  landingVersion: string;
  locale: string;
  deviceClass: string | null;
};

/** 필수 동의 저장 성공 후에만 호출한다. (Q-053) */
export async function createResponse(
  input: CreateResponseInput,
): Promise<SurveyResponse> {
  const now = new Date().toISOString();
  const row: SurveyResponse = {
    response_id: randomUUID(),
    utm_source: input.utm.source ?? null,
    utm_medium: input.utm.medium ?? null,
    utm_campaign: input.utm.campaign ?? null,
    utm_content: input.utm.content ?? null,
    landing_version: input.landingVersion,
    locale: input.locale,
    device_class: input.deviceClass,
    status: "consented",
    created_at: now,
    updated_at: now,
    consent_at: now,
    form_started_at: null,
    problem_completed_at: null,
    solution_viewed_at: null,
    sample_requested_at: null,
    contact_submitted_at: null,
    problem_locked: false,
    last_step: "consent",
    travel_experience: null,
    planning_scope: null,
    travel_region: null,
    inc_type: null,
    inc_description: null,
    inc_timing: null,
    src_first: null,
    src_first_other: null,
    src_next: null,
    src_next_other: null,
    src_move_reasons: null,
    src_move_reason_other: null,
    imp_outcomes: null,
    imp_outcome_other: null,
    imp_extra_time: null,
    alt_sufficient_note: null,
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => data.survey_response.push(row));
    return row;
  }
  const { data, error } = await db
    .from("survey_response")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`createResponse: ${error.message}`);
  return data as SurveyResponse;
}

export async function getResponse(
  responseId: string,
): Promise<SurveyResponse | null> {
  const db = supabase();
  if (!db) {
    const data = await readDev();
    return data.survey_response.find((r) => r.response_id === responseId) ?? null;
  }
  const { data, error } = await db
    .from("survey_response")
    .select()
    .eq("response_id", responseId)
    .maybeSingle();
  if (error) throw new Error(`getResponse: ${error.message}`);
  return (data as SurveyResponse) ?? null;
}

export async function updateResponse(
  responseId: string,
  patch: Partial<SurveyResponse>,
): Promise<SurveyResponse> {
  const db = supabase();
  if (!db) {
    return mutateDev((data) => {
      const row = data.survey_response.find((r) => r.response_id === responseId);
      if (!row) throw new Error("updateResponse: response not found");
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      return row;
    });
  }
  const { data, error } = await db
    .from("survey_response")
    .update(patch)
    .eq("response_id", responseId)
    .select()
    .single();
  if (error) throw new Error(`updateResponse: ${error.message}`);
  return data as SurveyResponse;
}

/**
 * 최종 문제응답 저장과 잠금을 하나의 성공 단위로 처리한다. (Q-057)
 * 이미 잠긴 응답에는 아무것도 쓰지 않고 기존 상태를 그대로 돌려준다.
 */
export async function completeAndLock(
  responseId: string,
  patch: Partial<SurveyResponse>,
): Promise<{ row: SurveyResponse; alreadyCompleted: boolean }> {
  const db = supabase();
  const completedAt = new Date().toISOString();
  const full: Partial<SurveyResponse> = {
    ...patch,
    status: "problem_completed",
    problem_completed_at: completedAt,
    problem_locked: true,
    last_step: "impact",
  };

  if (!db) {
    return mutateDev((data) => {
      const row = data.survey_response.find((r) => r.response_id === responseId);
      if (!row) throw new Error("completeAndLock: response not found");
      if (row.problem_locked) return { row, alreadyCompleted: true };
      Object.assign(row, full, { updated_at: completedAt });
      return { row, alreadyCompleted: false };
    });
  }

  // 잠기지 않은 행만 갱신한다. 동시 요청 중 하나만 성공한다.
  const { data, error } = await db
    .from("survey_response")
    .update(full)
    .eq("response_id", responseId)
    .eq("problem_locked", false)
    .select()
    .maybeSingle();
  if (error) throw new Error(`completeAndLock: ${error.message}`);
  if (data) return { row: data as SurveyResponse, alreadyCompleted: false };

  const existing = await getResponse(responseId);
  if (!existing) throw new Error("completeAndLock: response not found");
  return { row: existing, alreadyCompleted: true };
}

// --------------------------------------------------------------- sample request

export async function saveSampleRequest(input: {
  responseId: string;
  focus: string[];
  focusOther: string | null;
  note: string | null;
  neededBy: string | null;
}): Promise<void> {
  const row: SampleRequestRow = {
    request_id: randomUUID(),
    response_id: input.responseId,
    focus: input.focus,
    focus_other: input.focusOther,
    note: input.note,
    needed_by: input.neededBy,
    created_at: new Date().toISOString(),
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => {
      const i = data.sample_request.findIndex(
        (r) => r.response_id === input.responseId,
      );
      if (i >= 0)
        data.sample_request[i] = {
          ...row,
          request_id: data.sample_request[i].request_id,
        };
      else data.sample_request.push(row);
    });
    return;
  }
  const { error } = await db
    .from("sample_request")
    .upsert(row, { onConflict: "response_id" });
  if (error) throw new Error(`saveSampleRequest: ${error.message}`);
}

// --------------------------------------------------------------- contact

export async function saveContact(input: {
  responseId: string;
  email: string;
  consentSample: boolean;
}): Promise<void> {
  const row: ContactRow = {
    contact_id: randomUUID(),
    response_id: input.responseId,
    email: input.email,
    consent_sample: input.consentSample,
    consented_at: new Date().toISOString(),
    withdrawn_at: null,
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => {
      const i = data.contact.findIndex((r) => r.response_id === input.responseId);
      if (i >= 0)
        data.contact[i] = { ...row, contact_id: data.contact[i].contact_id };
      else data.contact.push(row);
    });
    return;
  }
  const { error } = await db
    .from("contact")
    .upsert(row, { onConflict: "response_id" });
  if (error) throw new Error(`saveContact: ${error.message}`);
}

// --------------------------------------------------------------- fulfillment

/** 운영자 전용. 추첨·선정·제공·종료 상태를 기록한다. */
export async function upsertFulfillment(
  responseId: string,
  patch: Partial<FulfillmentRow>,
): Promise<FulfillmentRow> {
  const now = new Date().toISOString();
  const base: FulfillmentRow = {
    response_id: responseId,
    review_status: "pending",
    lottery_completed_at: null,
    selected: null,
    selected_at: null,
    sample_delivered_at: null,
    fulfillment_closed_at: null,
    closed_reason_category: null,
    operator_note: null,
    updated_at: now,
  };

  const db = supabase();
  if (!db) {
    return mutateDev((data) => {
      const existing = data.fulfillment.find((r) => r.response_id === responseId);
      if (existing) {
        Object.assign(existing, patch, { updated_at: now });
        return existing;
      }
      const row = { ...base, ...patch, updated_at: now };
      data.fulfillment.push(row);
      return row;
    });
  }

  const { data, error } = await db
    .from("fulfillment")
    .upsert({ ...base, ...patch, updated_at: now }, { onConflict: "response_id" })
    .select()
    .single();
  if (error) throw new Error(`upsertFulfillment: ${error.message}`);
  return data as FulfillmentRow;
}

// --------------------------------------------------------------- events

/**
 * 이벤트를 한 번만 기록한다. 같은 dedupe_key 재시도는 조용히 무시한다.
 * 동의 후 행동만 들어온다. 설문 원문·이메일은 params 에 넣지 않는다.
 */
export async function logEvent(input: {
  responseId: string;
  event: string;
  step?: string | null;
  params?: Record<string, unknown>;
}): Promise<void> {
  const dedupeKey = [input.responseId, input.event, input.step ?? ""].join("|");

  const row: EventRow = {
    response_id: input.responseId,
    event: input.event,
    step: input.step ?? null,
    occurred_at: new Date().toISOString(),
    params: input.params ?? {},
    dedupe_key: dedupeKey,
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => {
      if (data.event_log.some((e) => e.dedupe_key === dedupeKey)) return;
      data.event_log.push(row);
    });
    return;
  }
  const { error } = await db.from("event_log").insert(row);
  // 23505 = unique_violation. 같은 행동의 재전송이므로 정상 흐름이다.
  if (error && error.code !== "23505") {
    throw new Error(`logEvent: ${error.message}`);
  }
}

// --------------------------------------------------------------- 자동파기

const DAY = 24 * 60 * 60 * 1000;

export async function purgeExpired(): Promise<
  { category: string; deleted: number }[]
> {
  const db = supabase();
  if (!db) {
    return mutateDev((data) => {
      const now = Date.now();
      const older = (iso: string | null | undefined, days: number) =>
        !!iso && now - new Date(iso).getTime() > days * DAY;
      const results: { category: string; deleted: number }[] = [];
      const log = (category: string, deleted: number) => {
        data.purge_log.push({
          ran_at: new Date().toISOString(),
          category,
          deleted,
          failed: 0,
          error_detail: null,
        });
        results.push({ category, deleted });
      };

      const dropResponses = (ids: string[]) => {
        if (ids.length === 0) return;
        data.survey_response = data.survey_response.filter(
          (r) => !ids.includes(r.response_id),
        );
        data.sample_request = data.sample_request.filter(
          (r) => !ids.includes(r.response_id),
        );
        data.contact = data.contact.filter((r) => !ids.includes(r.response_id));
        data.fulfillment = data.fulfillment.filter(
          (r) => !ids.includes(r.response_id),
        );
        data.event_log = data.event_log.filter(
          (e) => !ids.includes(e.response_id),
        );
      };

      // 1. 중도 이탈 부분응답 — updated_at + 30일
      const partial = data.survey_response
        .filter((r) => r.status !== "problem_completed" && older(r.updated_at, 30))
        .map((r) => r.response_id);
      dropResponses(partial);
      log("partial_response", partial.length);

      // 2. 완료된 문제응답 — problem_completed_at + 12개월
      const completed = data.survey_response
        .filter(
          (r) =>
            r.status === "problem_completed" &&
            older(r.problem_completed_at, 365),
        )
        .map((r) => r.response_id);
      dropResponses(completed);
      log("completed_response", completed.length);

      const dropContactAndSample = (ids: string[], category: string) => {
        const before = data.contact.length + data.sample_request.length;
        data.contact = data.contact.filter((r) => !ids.includes(r.response_id));
        data.sample_request = data.sample_request.filter(
          (r) => !ids.includes(r.response_id),
        );
        const after = data.contact.length + data.sample_request.length;
        log(category, before - after);
      };

      // 3. 미선정자 — lottery_completed_at + 30일
      dropContactAndSample(
        data.fulfillment
          .filter((f) => f.selected !== true && older(f.lottery_completed_at, 30))
          .map((f) => f.response_id),
        "not_selected_contact",
      );

      // 4. 선정자 — sample_delivered_at + 30일
      dropContactAndSample(
        data.fulfillment
          .filter((f) => older(f.sample_delivered_at, 30))
          .map((f) => f.response_id),
        "delivered_contact",
      );

      // 5. 제공 종료 — fulfillment_closed_at + 30일
      dropContactAndSample(
        data.fulfillment
          .filter((f) => older(f.fulfillment_closed_at, 30))
          .map((f) => f.response_id),
        "closed_contact",
      );

      return results;
    });
  }

  const { data, error } = await db.rpc("purge_expired");
  if (error) {
    // 재실행할 수 있도록 실패를 남긴다.
    await db.from("purge_log").insert({
      category: "run",
      deleted: 0,
      failed: 1,
      error_detail: error.message,
    });
    throw new Error(`purgeExpired: ${error.message}`);
  }
  return (data ?? []) as { category: string; deleted: number }[];
}

// --------------------------------------------------------------- export

async function listAll<T>(table: string, order?: string): Promise<T[]> {
  const db = supabase();
  if (!db) {
    const data = await readDev();
    return (data[table as keyof DevData] ?? []) as T[];
  }
  const query = db.from(table).select();
  const { data, error } = order
    ? await query.order(order, { ascending: true })
    : await query;
  if (error) throw new Error(`list ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export const listResponses = () =>
  listAll<SurveyResponse>("survey_response", "created_at");
export const listSampleRequests = () =>
  listAll<SampleRequestRow>("sample_request", "created_at");
export const listContacts = () => listAll<ContactRow>("contact", "consented_at");
export const listEvents = () => listAll<EventRow>("event_log", "occurred_at");
export const listFulfillment = () => listAll<FulfillmentRow>("fulfillment");
export const listLandingAggregates = () =>
  listAll<LandingAggregateRow>("landing_aggregate", "event_date");
export const listPurgeLog = () => listAll<PurgeLogRow>("purge_log", "ran_at");
