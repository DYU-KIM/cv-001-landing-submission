/**
 * 저장소 접근 계층.
 *
 * 운영: Supabase Postgres (service role 키를 서버에서만 사용)
 * 개발: SUPABASE 환경변수가 없으면 .data/dev-store.json 파일 저장소로 대체한다.
 *       스키마와 규칙은 같고, 실제 배포에는 사용하지 않는다.
 *
 * 여기서만 DB에 접근한다. 화면·라우트가 직접 Supabase 클라이언트를 만들지 않는다.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ResponseStatus =
  | "consented"
  | "ineligible"
  | "partial"
  | "problem_completed";

export type SurveyResponse = {
  response_id: string;
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_version: string;
  locale: string;
  device_class: string | null;
  status: ResponseStatus;
  created_at: string;
  consent_at: string | null;
  form_started_at: string | null;
  problem_completed_at: string | null;
  solution_viewed_at: string | null;
  sample_requested_at: string | null;
  contact_submitted_at: string | null;
  problem_locked: boolean;
  last_step: string | null;
  elig_status: string | null;
  elig_scope: string[] | null;
  elig_region: string | null;
  ineligible_reason: string | null;
  inc_type: string | null;
  inc_description: string | null;
  inc_timing: string | null;
  src_first: string | null;
  src_next: string[] | null;
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
  needed_by: string;
  created_at: string;
};

export type ContactRow = {
  contact_id: string;
  response_id: string;
  email: string;
  consent_sample: boolean;
  consent_followup: boolean;
  consented_at: string;
  withdrawn_at: string | null;
};

export type EventRow = {
  session_id: string;
  response_id: string | null;
  event: string;
  step: string | null;
  occurred_at: string;
  params: Record<string, unknown>;
  dedupe_key: string;
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
  survey_response: SurveyResponse[];
  sample_request: SampleRequestRow[];
  contact: ContactRow[];
  event_log: EventRow[];
};

const DEV_FILE = path.join(process.cwd(), ".data", "dev-store.json");
let devWrite: Promise<void> = Promise.resolve();

async function readDev(): Promise<DevData> {
  try {
    return JSON.parse(await fs.readFile(DEV_FILE, "utf8")) as DevData;
  } catch {
    return { survey_response: [], sample_request: [], contact: [], event_log: [] };
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

// --------------------------------------------------------------- responses

export type CreateResponseInput = {
  sessionId: string;
  utm: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
  };
  landingVersion: string;
  locale: string;
  deviceClass: string | null;
};

export async function createResponse(
  input: CreateResponseInput,
): Promise<SurveyResponse> {
  const now = new Date().toISOString();
  const row: SurveyResponse = {
    response_id: randomUUID(),
    session_id: input.sessionId,
    utm_source: input.utm.source ?? null,
    utm_medium: input.utm.medium ?? null,
    utm_campaign: input.utm.campaign ?? null,
    utm_content: input.utm.content ?? null,
    landing_version: input.landingVersion,
    locale: input.locale,
    device_class: input.deviceClass,
    status: "consented",
    created_at: now,
    consent_at: now,
    form_started_at: null,
    problem_completed_at: null,
    solution_viewed_at: null,
    sample_requested_at: null,
    contact_submitted_at: null,
    problem_locked: false,
    last_step: "consent",
    elig_status: null,
    elig_scope: null,
    elig_region: null,
    ineligible_reason: null,
    inc_type: null,
    inc_description: null,
    inc_timing: null,
    src_first: null,
    src_next: null,
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
      Object.assign(row, patch);
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

// --------------------------------------------------------------- sample request

export async function saveSampleRequest(input: {
  responseId: string;
  focus: string[];
  focusOther: string | null;
  note: string | null;
  neededBy: string;
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
      if (i >= 0) data.sample_request[i] = { ...row, request_id: data.sample_request[i].request_id };
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
  consentFollowup: boolean;
}): Promise<void> {
  const row: ContactRow = {
    contact_id: randomUUID(),
    response_id: input.responseId,
    email: input.email,
    consent_sample: input.consentSample,
    consent_followup: input.consentFollowup,
    consented_at: new Date().toISOString(),
    withdrawn_at: null,
  };

  const db = supabase();
  if (!db) {
    await mutateDev((data) => {
      const i = data.contact.findIndex((r) => r.response_id === input.responseId);
      if (i >= 0) data.contact[i] = { ...row, contact_id: data.contact[i].contact_id };
      else data.contact.push(row);
    });
    return;
  }
  const { error } = await db
    .from("contact")
    .upsert(row, { onConflict: "response_id" });
  if (error) throw new Error(`saveContact: ${error.message}`);
}

// --------------------------------------------------------------- events

/**
 * 이벤트를 한 번만 기록한다. 같은 dedupe_key 재시도는 조용히 무시한다.
 * (contract: "이벤트는 한 행동에 중복 발화하지 않으며")
 */
export async function logEvent(input: {
  sessionId: string;
  responseId?: string | null;
  event: string;
  step?: string | null;
  params?: Record<string, unknown>;
}): Promise<void> {
  const dedupeKey = [
    input.responseId ?? input.sessionId,
    input.event,
    input.step ?? "",
  ].join("|");

  const row: EventRow = {
    session_id: input.sessionId,
    response_id: input.responseId ?? null,
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

// --------------------------------------------------------------- export

export async function listResponses(): Promise<SurveyResponse[]> {
  const db = supabase();
  if (!db) return (await readDev()).survey_response;
  const { data, error } = await db
    .from("survey_response")
    .select()
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listResponses: ${error.message}`);
  return (data ?? []) as SurveyResponse[];
}

export async function listSampleRequests(): Promise<SampleRequestRow[]> {
  const db = supabase();
  if (!db) return (await readDev()).sample_request;
  const { data, error } = await db.from("sample_request").select();
  if (error) throw new Error(`listSampleRequests: ${error.message}`);
  return (data ?? []) as SampleRequestRow[];
}

export async function listContacts(): Promise<ContactRow[]> {
  const db = supabase();
  if (!db) return (await readDev()).contact;
  const { data, error } = await db
    .from("contact")
    .select()
    .order("consented_at", { ascending: true });
  if (error) throw new Error(`listContacts: ${error.message}`);
  return (data ?? []) as ContactRow[];
}

export async function listEvents(): Promise<EventRow[]> {
  const db = supabase();
  if (!db) return (await readDev()).event_log;
  const { data, error } = await db
    .from("event_log")
    .select()
    .order("occurred_at", { ascending: true });
  if (error) throw new Error(`listEvents: ${error.message}`);
  return (data ?? []) as EventRow[];
}
