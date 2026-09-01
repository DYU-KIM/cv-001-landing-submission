"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONSENT,
  CONTACT_CONSENT,
  CONTACT_EMAIL,
  ELIG_SCOPE,
  ELIG_STATUS,
  EXIT,
  IMP_OUTCOME,
  IMP_TIME,
  INC_DESCRIPTION_EXAMPLE,
  INC_TIMING,
  INC_TYPE,
  SMP_FOCUS,
  SMP_FOCUS_MAX,
  SOLUTION,
  SRC_MOVE_REASON,
  SRC_NEXT_MAX,
  SRC_NEXT_NONE,
  SRC_NEXT_NONE_LABEL,
  SRC_OPTIONS,
  SRC_REASON_MAX,
  labelOf,
} from "@/lib/contract";
import {
  consentSchema,
  contactSchema,
  eligibilitySchema,
  firstIssue,
  hasUpcomingTrip,
  impactSchema,
  incidentSchema,
  sampleSchema,
  sourcesSchema,
} from "@/lib/validation";
import {
  Check,
  CheckboxGroup,
  Field,
  OrderedPicker,
  PrimaryButton,
  QuietButton,
  RadioGroup,
  SaveError,
  TextArea,
  TextInput,
} from "./fields";

type Step =
  | "consent"
  | "eligibility"
  | "incident"
  | "sources"
  | "impact"
  | "solution"
  | "sample"
  | "contact"
  | "ineligible"
  | "doneSurvey"
  | "doneRequest";

type Values = {
  consent: boolean;
  age: boolean;
  eligStatus: string;
  eligScope: string[];
  eligRegion: string;
  incType: string;
  incDescription: string;
  incTiming: string;
  srcFirst: string;
  srcNext: string[];
  srcMoveReasons: string[];
  srcMoveReasonOther: string;
  impOutcomes: string[];
  impOutcomeOther: string;
  impExtraTime: string;
  altSufficientNote: string;
  focus: string[];
  focusOther: string;
  note: string;
  neededBy: string;
  email: string;
  consentSample: boolean;
  consentFollowup: boolean;
};

const EMPTY: Values = {
  consent: false,
  age: false,
  eligStatus: "",
  eligScope: [],
  eligRegion: "",
  incType: "",
  incDescription: "",
  incTiming: "",
  srcFirst: "",
  srcNext: [],
  srcMoveReasons: [],
  srcMoveReasonOther: "",
  impOutcomes: [],
  impOutcomeOther: "",
  impExtraTime: "",
  altSufficientNote: "",
  focus: [],
  focusOther: "",
  note: "",
  neededBy: "",
  email: "",
  consentSample: false,
  consentFollowup: false,
};

const DRAFT_KEY = "cv001.draft";
const SURVEY_STEPS: Step[] = ["eligibility", "incident", "sources", "impact"];

export default function SurveyFlow() {
  const [step, setStep] = useState<Step>("consent");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const retry = useRef<(() => void) | null>(null);

  // 같은 탭에서 새로고침이 나면 현재 단계 입력을 복원한다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { step: Step; values: Values };
        setStep(draft.step);
        setValues({ ...EMPTY, ...draft.values });
      }
    } catch {
      // 복원 실패는 조사 진행을 막지 않는다.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, values }));
    } catch {
      // 저장 공간이 없어도 진행은 계속한다.
    }
  }, [step, values, restored]);

  useEffect(() => {
    if (step === "eligibility") {
      void fetch("/api/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "form_started" }),
      });
    }
  }, [step]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const post = useCallback(
    async (url: string, body: unknown): Promise<Record<string, unknown> | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          fields?: Record<string, string>;
        };
        if (!res.ok || !data.ok) {
          if (data.fields) setErrors(data.fields);
          setSaveError(data.message ?? "저장하지 못했습니다.");
          return null;
        }
        return data as Record<string, unknown>;
      } catch {
        setSaveError(
          "네트워크 연결이 끊겨 저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  /** 클라이언트 검사를 통과한 경우에만 저장을 시도한다. 저장 성공 전에는 화면을 넘기지 않는다. */
  const submit = useCallback(
    async (
      check: () => Record<string, string> | null,
      send: () => Promise<Record<string, unknown> | null>,
      onSuccess: (data: Record<string, unknown>) => void,
    ) => {
      const issues = check();
      if (issues) {
        setErrors(issues);
        return;
      }
      setErrors({});
      const run = async () => {
        const data = await send();
        if (data) {
          retry.current = null;
          onSuccess(data);
        }
      };
      retry.current = () => void run();
      await run();
    },
    [],
  );

  const validate = <T,>(schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, value: T) => {
    const result = schema.safeParse(value);
    if (result.success) return null;
    return firstIssue(result.error as Parameters<typeof firstIssue>[0]);
  };

  if (!restored) return null;

  const stepIndex = SURVEY_STEPS.indexOf(step);

  return (
    <main className="mx-auto w-full max-w-[46rem] px-5 py-10 sm:py-14">
      {stepIndex >= 0 ? (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>여행 준비 경험</span>
            <span>
              {stepIndex + 1} / {SURVEY_STEPS.length}
            </span>
          </div>
          <div className="h-1 w-full rounded bg-soft">
            <div
              className="h-1 rounded bg-accent transition-all"
              style={{
                width: `${((stepIndex + 1) / SURVEY_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {saveError ? (
        <SaveError
          message={saveError}
          retrying={saving}
          onRetry={() => retry.current?.()}
        />
      ) : null}

      {step === "consent" ? (
        <section>
          <h1 className="mb-4 text-2xl font-bold">조사 안내와 동의</h1>
          {CONSENT.intro.map((line) => (
            <p key={line} className="mb-3 text-muted">
              {line}
            </p>
          ))}

          <div className="my-6 rounded-xl bg-soft p-5 text-sm text-muted">
            <p className="mb-1">{CONSENT.purpose}</p>
            <p className="mb-1">{CONSENT.items}</p>
            <p className="mb-1">{CONSENT.retention}</p>
            <p className="mb-1">{CONSENT.refusal}</p>
            <p>문의·삭제 요청: {CONTACT_EMAIL}</p>
          </div>

          <div className="mb-6 grid gap-2">
            <Check
              checked={values.consent}
              onChange={(v) => set("consent", v)}
            >
              {CONSENT.consentLabel}
            </Check>
            <Check checked={values.age} onChange={(v) => set("age", v)}>
              {CONSENT.ageLabel}
            </Check>
          </div>
          {errors.consent || errors.age ? (
            <p role="alert" className="mb-4 text-sm text-danger">
              {errors.consent ?? errors.age}
            </p>
          ) : null}

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () => validate(consentSchema, { consent: values.consent, age: values.age }),
                () =>
                  post("/api/consent", {
                    consent: values.consent,
                    age: values.age,
                  }),
                () => setStep("eligibility"),
              )
            }
          >
            {saving ? "저장하는 중…" : "동의하고 시작하기"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "eligibility" ? (
        <section>
          <h1 className="mb-6 text-2xl font-bold">대상 확인</h1>

          <Field label="현재 어떤 상황에 해당하나요?" required error={errors.eligStatus}>
            <RadioGroup
              name="eligStatus"
              options={ELIG_STATUS}
              value={values.eligStatus}
              onChange={(v) => set("eligStatus", v)}
            />
          </Field>

          <Field
            label="이 여행에서 직접 정했거나 현재 직접 정하고 있는 것은 무엇인가요?"
            required
            error={errors.eligScope}
          >
            <CheckboxGroup
              options={ELIG_SCOPE}
              values={values.eligScope}
              onChange={(v) => set("eligScope", v)}
            />
          </Field>

          <Field
            label="여행한 또는 여행할 일본의 도시·지역은 어디인가요?"
            required
            error={errors.eligRegion}
          >
            <TextInput
              value={values.eligRegion}
              onChange={(v) => set("eligRegion", v)}
              placeholder="예: 도쿄, 교토 근교"
              max={60}
            />
          </Field>

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () =>
                  validate(eligibilitySchema, {
                    eligStatus: values.eligStatus,
                    eligScope: values.eligScope,
                    eligRegion: values.eligRegion,
                  }),
                () =>
                  post("/api/step", {
                    step: "eligibility",
                    values: {
                      eligStatus: values.eligStatus,
                      eligScope: values.eligScope,
                      eligRegion: values.eligRegion,
                    },
                  }),
                (data) =>
                  setStep(data.next === "ineligible" ? "ineligible" : "incident"),
              )
            }
          >
            {saving ? "저장하는 중…" : "다음"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "incident" ? (
        <section>
          <h1 className="mb-3 text-2xl font-bold">실제 정보결정 사건</h1>
          <p className="mb-8 text-muted">
            최근 여행 또는 현재 준비 중인 여행에서, 정보를 가장 많이 다시 확인했던 한
            가지 상황만 떠올려주세요.
          </p>

          <Field label="어떤 정보를 결정하는 상황이었나요?" required error={errors.incType}>
            <RadioGroup
              name="incType"
              options={INC_TYPE}
              value={values.incType}
              onChange={(v) => set("incType", v)}
            />
          </Field>

          {values.incType && values.incType !== "none" ? (
            <Field
              label="당시 무엇을 결정하려고 했는지 구체적으로 적어주세요."
              required
              hint={INC_DESCRIPTION_EXAMPLE}
              error={errors.incDescription}
            >
              <TextArea
                value={values.incDescription}
                onChange={(v) => set("incDescription", v)}
                max={300}
                rows={5}
              />
            </Field>
          ) : null}

          <Field label="이 상황은 언제였나요?" required error={errors.incTiming}>
            <RadioGroup
              name="incTiming"
              options={INC_TIMING}
              value={values.incTiming}
              onChange={(v) => set("incTiming", v)}
            />
          </Field>

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () =>
                  validate(incidentSchema, {
                    incType: values.incType,
                    incDescription: values.incDescription,
                    incTiming: values.incTiming,
                  }),
                () =>
                  post("/api/step", {
                    step: "incident",
                    values: {
                      incType: values.incType,
                      incDescription: values.incDescription,
                      incTiming: values.incTiming,
                    },
                  }),
                () => setStep("sources"),
              )
            }
          >
            {saving ? "저장하는 중…" : "다음"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "sources" ? (
        <section>
          <h1 className="mb-6 text-2xl font-bold">정보원과 이동</h1>

          <Field label="가장 먼저 어디에서 찾아봤나요?" required error={errors.srcFirst}>
            <RadioGroup
              name="srcFirst"
              options={SRC_OPTIONS}
              value={values.srcFirst}
              onChange={(v) => set("srcFirst", v)}
            />
          </Field>

          <Field
            label="그다음 확인한 곳이 있다면 순서대로 골라주세요."
            error={errors.srcNext}
          >
            <OrderedPicker
              options={[
                ...SRC_OPTIONS.filter((o) => o.value !== values.srcFirst),
                { value: SRC_NEXT_NONE, label: SRC_NEXT_NONE_LABEL },
              ]}
              values={values.srcNext}
              onChange={(v) => set("srcNext", v)}
              max={SRC_NEXT_MAX}
              exclusive={SRC_NEXT_NONE}
            />
          </Field>

          <Field
            label="첫 번째 정보만으로 끝내지 못했다면 이유는 무엇인가요?"
            required
            error={errors.srcMoveReasons}
          >
            <CheckboxGroup
              options={SRC_MOVE_REASON}
              values={values.srcMoveReasons}
              onChange={(v) => set("srcMoveReasons", v)}
              max={SRC_REASON_MAX}
            />
          </Field>

          {values.srcMoveReasons.includes("other") ? (
            <Field label="기타 이유를 적어주세요." required error={errors.srcMoveReasonOther}>
              <TextArea
                value={values.srcMoveReasonOther}
                onChange={(v) => set("srcMoveReasonOther", v)}
                max={120}
                rows={3}
              />
            </Field>
          ) : null}

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () =>
                  validate(sourcesSchema, {
                    srcFirst: values.srcFirst,
                    srcNext: values.srcNext,
                    srcMoveReasons: values.srcMoveReasons,
                    srcMoveReasonOther: values.srcMoveReasonOther,
                  }),
                () =>
                  post("/api/step", {
                    step: "sources",
                    values: {
                      srcFirst: values.srcFirst,
                      srcNext: values.srcNext,
                      srcMoveReasons: values.srcMoveReasons,
                      srcMoveReasonOther: values.srcMoveReasonOther,
                    },
                  }),
                () => setStep("impact"),
              )
            }
          >
            {saving ? "저장하는 중…" : "다음"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "impact" ? (
        <section>
          <h1 className="mb-6 text-2xl font-bold">실제 영향과 현재 대안</h1>

          <Field
            label="정보를 확인한 뒤 실제로 무엇이 달라졌나요?"
            required
            error={errors.impOutcomes}
          >
            <CheckboxGroup
              options={IMP_OUTCOME}
              values={values.impOutcomes}
              onChange={(v) => set("impOutcomes", v)}
            />
          </Field>

          {values.impOutcomes.includes("other") ? (
            <Field label="기타 내용을 적어주세요." required error={errors.impOutcomeOther}>
              <TextArea
                value={values.impOutcomeOther}
                onChange={(v) => set("impOutcomeOther", v)}
                max={120}
                rows={3}
              />
            </Field>
          ) : null}

          <Field
            label="추가 확인에 든 시간을 가장 가까운 범위로 골라주세요."
            error={errors.impExtraTime}
          >
            <RadioGroup
              name="impExtraTime"
              options={IMP_TIME}
              value={values.impExtraTime}
              onChange={(v) => set("impExtraTime", v)}
            />
          </Field>

          <Field
            label="지금 사용한 무료 정보원만으로 충분했던 부분이 있다면 적어주세요."
            error={errors.altSufficientNote}
          >
            <TextArea
              value={values.altSufficientNote}
              onChange={(v) => set("altSufficientNote", v)}
              max={200}
              rows={4}
            />
          </Field>

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () =>
                  validate(impactSchema, {
                    impOutcomes: values.impOutcomes,
                    impOutcomeOther: values.impOutcomeOther,
                    impExtraTime: values.impExtraTime,
                    altSufficientNote: values.altSufficientNote,
                  }),
                () =>
                  post("/api/step", {
                    step: "impact",
                    values: {
                      impOutcomes: values.impOutcomes,
                      impOutcomeOther: values.impOutcomeOther,
                      impExtraTime: values.impExtraTime,
                      altSufficientNote: values.altSufficientNote,
                    },
                  }),
                () => setStep("solution"),
              )
            }
          >
            {saving ? "제출하는 중…" : "여행 준비 경험 제출하기"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "solution" ? (
        <SolutionReveal
          eligStatus={values.eligStatus}
          region={values.eligRegion}
          onRequest={() => {
            void fetch("/api/event", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ event: "sample_request_started" }),
            });
            setStep("sample");
          }}
          onFinish={() => setStep("doneSurvey")}
        />
      ) : null}

      {step === "sample" ? (
        <section>
          <h1 className="mb-3 text-2xl font-bold">여행 조건</h1>
          <p className="mb-8 text-sm text-muted">
            앞에서 알려주신 지역은 <b className="text-ink">{values.eligRegion}</b>
            이고, 상황은{" "}
            <b className="text-ink">{labelOf(ELIG_STATUS, values.eligStatus)}</b>
            입니다. 다시 입력하지 않으셔도 됩니다.
          </p>

          <Field
            label="이번 샘플에서 가장 중요하게 확인하고 싶은 조건은 무엇인가요?"
            required
            error={errors.focus}
          >
            <CheckboxGroup
              options={SMP_FOCUS}
              values={values.focus}
              onChange={(v) => set("focus", v)}
              max={SMP_FOCUS_MAX}
            />
          </Field>

          {values.focus.includes("other") ? (
            <Field label="기타 조건을 적어주세요." required error={errors.focusOther}>
              <TextInput
                value={values.focusOther}
                onChange={(v) => set("focusOther", v)}
                max={80}
              />
            </Field>
          ) : null}

          <Field
            label="현재 고민 중인 장소나 결정이 있다면 적어주세요."
            error={errors.note}
          >
            <TextArea
              value={values.note}
              onChange={(v) => set("note", v)}
              max={200}
              rows={4}
            />
          </Field>

          <Field label="이 정보가 필요한 시점은 언제인가요?" required error={errors.neededBy}>
            <TextInput
              type="date"
              value={values.neededBy}
              onChange={(v) => set("neededBy", v)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <PrimaryButton
            disabled={saving}
            onClick={() =>
              void submit(
                () =>
                  validate(sampleSchema, {
                    focus: values.focus,
                    focusOther: values.focusOther,
                    note: values.note,
                    neededBy: values.neededBy,
                  }),
                () =>
                  post("/api/sample", {
                    focus: values.focus,
                    focusOther: values.focusOther,
                    note: values.note,
                    neededBy: values.neededBy,
                  }),
                () => setStep("contact"),
              )
            }
          >
            {saving ? "저장하는 중…" : "다음"}
          </PrimaryButton>
        </section>
      ) : null}

      {step === "contact" ? (
        <section>
          <h1 className="mb-6 text-2xl font-bold">샘플 받을 곳</h1>

          <Field label={CONTACT_CONSENT.emailLabel} required error={errors.email}>
            <TextInput
              type="email"
              inputMode="email"
              value={values.email}
              onChange={(v) => set("email", v)}
              placeholder="name@example.com"
            />
          </Field>

          <p className="mb-6 rounded-xl bg-soft p-4 text-sm text-muted">
            {CONTACT_CONSENT.retentionNote}
          </p>

          <div className="mb-2 grid gap-2">
            <Check
              checked={values.consentSample}
              onChange={(v) => set("consentSample", v)}
            >
              {CONTACT_CONSENT.sampleConsent}
            </Check>
            <Check
              checked={values.consentFollowup}
              onChange={(v) => set("consentFollowup", v)}
            >
              {CONTACT_CONSENT.followupConsent}{" "}
              <span className="text-muted">(선택)</span>
            </Check>
          </div>
          {errors.consentSample ? (
            <p role="alert" className="mb-4 text-sm text-danger">
              {errors.consentSample}
            </p>
          ) : null}

          <div className="mt-6">
            <PrimaryButton
              disabled={saving}
              onClick={() =>
                void submit(
                  () =>
                    validate(contactSchema, {
                      email: values.email,
                      consentSample: values.consentSample,
                      consentFollowup: values.consentFollowup,
                    }),
                  () =>
                    post("/api/contact", {
                      email: values.email,
                      consentSample: values.consentSample,
                      consentFollowup: values.consentFollowup,
                    }),
                  () => setStep("doneRequest"),
                )
              }
            >
              {saving ? "제출하는 중…" : CONTACT_CONSENT.submit}
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {step === "ineligible" ? <Closing lines={[EXIT.ineligible]} /> : null}
      {step === "doneSurvey" ? <Closing lines={[EXIT.surveyOnly]} /> : null}
      {step === "doneRequest" ? <Closing lines={[...EXIT.requested]} /> : null}
    </main>
  );
}

/** SO-01. 문제 응답이 저장된 뒤에만 열리며, 열람 시점에 문제 답변을 잠근다. */
function SolutionReveal({
  eligStatus,
  region,
  onRequest,
  onFinish,
}: {
  eligStatus: string;
  region: string;
  onRequest: () => void;
  onFinish: () => void;
}) {
  useEffect(() => {
    void fetch("/api/solution", { method: "POST" });
  }, []);

  const upcoming = hasUpcomingTrip(eligStatus);

  return (
    <section>
      <p className="mb-2 text-sm text-muted">여행 준비 경험이 저장됐습니다.</p>
      <h1 className="mb-4 text-2xl font-bold">{SOLUTION.headline}</h1>
      <p className="mb-6 text-muted">{SOLUTION.body}</p>

      <div className="mb-6 rounded-xl border border-line p-5">
        <p className="mb-3 text-sm font-semibold">
          {region ? `${region} 기준 샘플 구성` : "샘플 구성"}
        </p>
        <ul className="grid gap-2 text-sm">
          {SOLUTION.includes.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-accent">
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mb-8 text-sm text-muted">{SOLUTION.boundary}</p>

      {upcoming ? (
        <div className="grid gap-3">
          <PrimaryButton onClick={onRequest}>{SOLUTION.cta}</PrimaryButton>
          <QuietButton onClick={onFinish}>{SOLUTION.secondary}</QuietButton>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="rounded-xl bg-soft p-4 text-sm text-muted">
            {SOLUTION.noUpcomingTrip}
          </p>
          <QuietButton onClick={onFinish}>조사 마치기</QuietButton>
        </div>
      )}
    </section>
  );
}

function Closing({ lines }: { lines: string[] }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // 무시한다.
    }
  }, []);

  return (
    <section className="py-10">
      <h1 className="mb-4 text-2xl font-bold">{lines[0]}</h1>
      {lines.slice(1).map((line) => (
        <p key={line} className="mb-3 text-muted">
          {line}
        </p>
      ))}
      <p className="mt-8 text-sm text-muted">문의·삭제 요청: {CONTACT_EMAIL}</p>
    </section>
  );
}
