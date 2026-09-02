"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONSENT,
  CONTACT_CONSENT,
  EXIT,
  IMP_OUTCOME,
  IMP_TIME,
  INC_DESCRIPTION_EXAMPLE,
  INC_TIMING,
  INC_TYPE,
  INQUIRY,
  PLANNING_SCOPE,
  SMP_FOCUS,
  SMP_FOCUS_MAX,
  SOLUTION,
  SRC_MOVE_REASON,
  SRC_NEXT_MAX,
  SRC_NEXT_NONE,
  SRC_NEXT_NONE_LABEL,
  SRC_OPTIONS,
  SRC_REASON_MAX,
  TRAVEL_EXPERIENCE,
  labelOf,
  labelsOf,
} from "@/lib/contract";
import {
  consentSchema,
  contactSchema,
  firstIssue,
  hasUpcomingTrip,
  impactSchema,
  incidentSchema,
  sampleSchema,
  sourcesSchema,
  travelContextSchema,
} from "@/lib/validation";
import {
  Check,
  CheckboxGroup,
  OrderedPicker,
  PrimaryButton,
  PrivacyTable,
  QuietButton,
  RadioGroup,
  SaveError,
  TextArea,
  TextInput,
} from "./fields";

type Phase = "problem" | "sample";
type Step = "consent" | "q" | "solution" | "doneSurvey" | "doneRequest";
type Group = "travelContext" | "incident" | "sources" | "impact" | "sample" | "contact";

type QKey =
  | "experience"
  | "planningScope"
  | "region"
  | "incType"
  | "incDescription"
  | "incTiming"
  | "srcFirst"
  | "srcNext"
  | "srcMoveReasons"
  | "srcMoveReasonOther"
  | "impOutcomes"
  | "impOutcomeOther"
  | "impExtraTime"
  | "altSufficientNote"
  | "focus"
  | "focusOther"
  | "note"
  | "neededBy"
  | "contact";

type Screen = { group: Group; key: QKey };

type Values = {
  consent: boolean;
  experience: string[];
  planningScope: string[];
  region: string;
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
};

const EMPTY: Values = {
  consent: false,
  experience: [],
  planningScope: [],
  region: "",
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
};

const DRAFT_KEY = "cv001.draft";

/**
 * 한 화면에 질문 하나만 보여준다.
 * 조건부 질문은 앞 답변에 따라 목록에서 빠지므로 진행률도 함께 줄어든다.
 * 서버 저장은 계약서대로 SF-01~SF-04 단위(그룹의 마지막 질문)에서 이뤄진다.
 */
function screensFor(values: Values, phase: Phase): Screen[] {
  if (phase === "sample") {
    return [
      { group: "sample", key: "focus" },
      { group: "sample", key: "note" },
      { group: "sample", key: "neededBy" },
      { group: "contact", key: "contact" },
    ];
  }

  const screens: Screen[] = [
    { group: "travelContext", key: "experience" },
    { group: "travelContext", key: "planningScope" },
    { group: "travelContext", key: "region" },
    { group: "incident", key: "incType" },
  ];
  if (values.incType && values.incType !== "none")
    screens.push({ group: "incident", key: "incDescription" });
  screens.push(
    { group: "incident", key: "incTiming" },
    { group: "sources", key: "srcFirst" },
    { group: "sources", key: "srcNext" },
    { group: "sources", key: "srcMoveReasons" },
  );
  screens.push(
    { group: "impact", key: "impOutcomes" },
    { group: "impact", key: "impExtraTime" },
    { group: "impact", key: "altSufficientNote" },
  );
  return screens;
}

const GROUP_SCHEMA = {
  travelContext: travelContextSchema,
  incident: incidentSchema,
  sources: sourcesSchema,
  impact: impactSchema,
  sample: sampleSchema,
  contact: contactSchema,
} as const;

function groupValues(group: Group, v: Values): Record<string, unknown> {
  switch (group) {
    case "travelContext":
      return {
        experience: v.experience,
        planningScope: v.planningScope,
        region: v.region,
      };
    case "incident":
      return {
        incType: v.incType,
        incDescription: v.incDescription,
        incTiming: v.incTiming,
      };
    case "sources":
      return {
        srcFirst: v.srcFirst,
        srcNext: v.srcNext,
        srcMoveReasons: v.srcMoveReasons,
        srcMoveReasonOther: v.srcMoveReasonOther,
      };
    case "impact":
      return {
        impOutcomes: v.impOutcomes,
        impOutcomeOther: v.impOutcomeOther,
        impExtraTime: v.impExtraTime,
        altSufficientNote: v.altSufficientNote,
      };
    case "sample":
      return {
        focus: v.focus,
        focusOther: v.focusOther,
        note: v.note,
        neededBy: v.neededBy,
      };
    case "contact":
      return { email: v.email, consentSample: v.consentSample };
  }
}

/** 랜딩에서 넘어온 캠페인 코드. 개인 식별값이 아니며 동의 저장 시점에만 함께 보낸다. */
function utmFromLocation(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "content"]) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value;
  }
  return utm;
}

export default function SurveyFlow() {
  const [step, setStep] = useState<Step>("consent");
  const [phase, setPhase] = useState<Phase>("problem");
  const [cursor, setCursor] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [locked, setLocked] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const retry = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          step: Step;
          phase: Phase;
          cursor: number;
          values: Values;
          locked?: boolean;
        };
        setValues({ ...EMPTY, ...draft.values });
        setPhase(draft.phase ?? "problem");
        setCursor(draft.cursor ?? 0);
        setLocked(!!draft.locked);
        setStep(draft.step);
      }
    } catch {
      // 복원 실패는 조사 진행을 막지 않는다.
    }
    setRestored(true);
  }, []);

  // 새로고침 후에도 서버 상태가 잠금이면 문제응답 화면으로 돌아가지 않는다.
  useEffect(() => {
    if (!restored || step === "consent") return;
    let cancelled = false;
    void fetch("/api/response")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const server = data.response as { problemLocked: boolean };
        if (server.problemLocked) {
          setLocked(true);
          setStep((current) =>
            current === "q" && phase === "problem" ? "solution" : current,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restored, step, phase]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, phase, cursor, values, locked }),
      );
    } catch {
      // 저장 공간이 없어도 진행은 계속한다.
    }
  }, [step, phase, cursor, values, locked, restored]);

  const screens = screensFor(values, phase);
  const current = screens[Math.min(cursor, screens.length - 1)];

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
          code?: string;
          fields?: Record<string, string>;
        };
        if (!res.ok || !data.ok) {
          if (data.fields) setErrors(data.fields);
          // 세션이 사라졌으면 재시도해도 성공할 수 없다.
          if (data.code === "NO_SESSION") setSessionLost(true);
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

  const run = useCallback(
    async (
      send: () => Promise<Record<string, unknown> | null>,
      onSuccess: (data: Record<string, unknown>) => void,
    ) => {
      const attempt = async () => {
        const data = await send();
        if (data) {
          retry.current = null;
          onSuccess(data);
        }
      };
      retry.current = () => void attempt();
      await attempt();
    },
    [],
  );

  const restart = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // 무시한다.
    }
    setValues(EMPTY);
    setErrors({});
    setSaveError(null);
    setSessionLost(false);
    setLocked(false);
    setPhase("problem");
    setCursor(0);
    setStep("consent");
  };

  if (!restored) return null;

  // ---------------------------------------------------------------- 동의

  if (step === "consent") {
    return (
      <Shell>
        {saveError ? (
          <SaveError
            message={saveError}
            retrying={saving}
            onRetry={() => retry.current?.()}
            onRestart={sessionLost ? restart : undefined}
          />
        ) : null}

        <h1 className="mb-4 text-2xl font-semibold leading-9">조사 안내와 동의</h1>
        {CONSENT.intro.map((line) => (
          <p key={line} className="mb-3 text-body">
            {line}
          </p>
        ))}

        <div className="my-6">
          <PrivacyTable rows={CONSENT.privacy} />
        </div>

        <p className="mb-6 rounded-2xl bg-weak p-5 text-sm text-weak-ink">
          {CONSENT.freeTextWarning}
        </p>

        <div className="mb-4">
          <Check checked={values.consent} onChange={(v) => set("consent", v)}>
            {CONSENT.consentLabel}
          </Check>
        </div>
        {errors.consent ? (
          <p role="alert" className="mb-4 text-sm text-danger">
            {errors.consent}
          </p>
        ) : null}

        <PrimaryButton
          disabled={saving}
          onClick={() => {
            const parsed = consentSchema.safeParse({ consent: values.consent });
            if (!parsed.success) {
              setErrors(firstIssue(parsed.error));
              return;
            }
            setErrors({});
            void run(
              () =>
                post("/api/consent", {
                  consent: values.consent,
                  utm: utmFromLocation(),
                }),
              () => {
                void fetch("/api/event", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ event: "form_started" }),
                });
                setCursor(0);
                setStep("q");
              },
            );
          }}
        >
          {saving ? "저장하는 중…" : CONSENT.submit}
        </PrimaryButton>

        <Inquiry />
      </Shell>
    );
  }

  // ---------------------------------------------------------------- 종료 화면

  if (step === "doneSurvey") return <Closing lines={[EXIT.surveyOnly]} />;
  if (step === "doneRequest") return <Closing lines={[...EXIT.requested]} />;

  // ---------------------------------------------------------------- 해결책

  if (step === "solution") {
    return (
      <SolutionReveal
        values={values}
        onRequest={() => {
          void fetch("/api/event", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "sample_request_started" }),
          });
          setPhase("sample");
          setCursor(0);
          setStep("q");
        }}
        onFinish={() => setStep("doneSurvey")}
      />
    );
  }

  // ---------------------------------------------------------------- 질문 화면

  const isLastOfGroup =
    cursor === screens.length - 1 || screens[cursor + 1].group !== current.group;

  const advance = () => {
    const schema = GROUP_SCHEMA[current.group];
    const parsed = schema.safeParse(groupValues(current.group, values));

    if (!parsed.success) {
      const issues = firstIssue(parsed.error);
      if (isLastOfGroup) {
        setErrors(issues);
        return;
      }
      if (issues[current.key]) {
        setErrors({ [current.key]: issues[current.key] });
        return;
      }
    }
    setErrors({});

    if (!isLastOfGroup) {
      setCursor(cursor + 1);
      return;
    }

    if (current.group === "contact") {
      void run(
        () =>
          post("/api/contact", {
            email: values.email,
            consentSample: values.consentSample,
          }),
        () => setStep("doneRequest"),
      );
      return;
    }

    if (current.group === "sample") {
      void run(
        () =>
          post("/api/sample", {
            focus: values.focus,
            focusOther: values.focusOther,
            note: values.note,
            neededBy: values.neededBy,
          }),
        () => setCursor(cursor + 1),
      );
      return;
    }

    void run(
      () =>
        post("/api/step", {
          step: current.group,
          values: groupValues(current.group, values),
        }),
      (data) => {
        if (data.next === "solution") {
          setLocked(true);
          setStep("solution");
          return;
        }
        setCursor(cursor + 1);
      },
    );
  };

  const q = QUESTIONS[current.key];
  const hint = hintFor(current.key, values);
  const submitLabel =
    current.group === "contact"
      ? CONTACT_CONSENT.submit
      : current.group === "impact" && isLastOfGroup
        ? "여행 준비 경험 제출하기"
        : "다음";

  return (
    <Shell>
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-muted">
          <span>{phase === "sample" ? "샘플 신청" : "여행 준비 경험"}</span>
          <span>
            {cursor + 1} / {screens.length}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-surface">
          <div
            className="h-1 rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((cursor + 1) / screens.length) * 100}%` }}
          />
        </div>
      </div>

      {saveError ? (
        <SaveError
          message={saveError}
          retrying={saving}
          onRetry={() => retry.current?.()}
          onRestart={sessionLost ? restart : undefined}
        />
      ) : null}

      <h1 className="mb-2 text-2xl font-semibold leading-9">
        {q.label}
        {q.optional ? (
          <span className="ml-2 align-middle text-sm font-normal text-muted">
            선택
          </span>
        ) : null}
      </h1>
      {hint ? <p className="mb-6 text-body">{hint}</p> : <div className="mb-6" />}

      <div className="mb-8">{renderInput(current.key, values, set)}</div>

      {errors[current.key] ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errors[current.key]}
        </p>
      ) : null}
      {isLastOfGroup && Object.keys(errors).some((k) => k !== current.key) ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {Object.entries(errors).find(([k]) => k !== current.key)?.[1]}
        </p>
      ) : null}

      <PrimaryButton disabled={saving} onClick={advance}>
        {saving ? "저장하는 중…" : submitLabel}
      </PrimaryButton>

      {cursor > 0 ? (
        <button
          type="button"
          onClick={() => {
            setErrors({});
            setCursor(cursor - 1);
          }}
          className="mt-4 w-full py-2 text-sm text-muted underline underline-offset-4"
        >
          이전으로
        </button>
      ) : null}
    </Shell>
  );
}

// ------------------------------------------------------------------ 질문 문구

const QUESTIONS: Record<QKey, { label: string; hint?: string; optional?: boolean }> = {
  experience: {
    label: "지금까지의 일본 자유여행 경험은 어떻게 되나요?",
    hint: "해당하는 것을 모두 골라주세요.",
  },
  planningScope: {
    label: "그 여행에서 직접 정했거나 정하고 있는 것은 무엇인가요?",
    hint: "해당하는 것을 모두 골라주세요.",
  },
  region: {
    label: "여행했거나 준비 중인 일본의 도시·지역이 있나요?",
    hint: "없으면 비워두고 넘어가셔도 됩니다.",
    optional: true,
  },
  incType: {
    label: "정보를 가장 많이 다시 확인했던 상황은 무엇이었나요?",
    hint: "여러 상황이 떠오르면 가장 기억에 남는 한 가지만 골라주세요.",
  },
  incDescription: {
    label: "그때 무엇을 정하려고 했는지 적어주세요.",
    hint: INC_DESCRIPTION_EXAMPLE,
  },
  incTiming: { label: "그 상황은 언제였나요?" },
  srcFirst: { label: "가장 먼저 어디에서 찾아보셨나요?" },
  srcNext: {
    label: "그다음 확인한 곳이 있다면 순서대로 골라주세요.",
    hint: "확인한 순서대로 눌러주세요.",
    optional: true,
  },
  srcMoveReasons: {
    label: "첫 번째 정보만으로 끝내지 못했다면 이유는 무엇인가요?",
    hint: "첫 정보로 충분했다면 그렇게 골라주셔도 됩니다.",
  },
  srcMoveReasonOther: { label: "기타 이유를 적어주세요." },
  impOutcomes: {
    label: "정보를 확인한 뒤 실제로 무엇이 달라졌나요?",
    hint: "해당하는 것을 모두 골라주세요.",
  },
  impOutcomeOther: { label: "기타 내용을 적어주세요." },
  impExtraTime: {
    label: "추가로 확인하는 데 시간이 얼마나 걸렸나요?",
    optional: true,
  },
  altSufficientNote: {
    label: "지금 쓰신 무료 정보만으로 충분했던 부분이 있나요?",
    hint: "없으면 비워두고 넘어가셔도 됩니다.",
    optional: true,
  },
  focus: {
    label: "샘플에서 가장 확인하고 싶은 것은 무엇인가요?",
    hint: `최대 ${SMP_FOCUS_MAX}개까지 고를 수 있습니다.`,
  },
  focusOther: { label: "기타 조건을 적어주세요." },
  note: {
    label: "지금 고민 중인 장소나 결정이 있나요?",
    hint: "구체적일수록 맞는 샘플을 만들 수 있습니다.",
    optional: true,
  },
  neededBy: { label: "이 정보가 언제 필요하신가요?" },
  contact: { label: "샘플을 어디로 보내드릴까요?" },
};

function renderInput(
  key: QKey,
  v: Values,
  set: <K extends keyof Values>(key: K, value: Values[K]) => void,
) {
  switch (key) {
    case "experience":
      return (
        <CheckboxGroup
          options={TRAVEL_EXPERIENCE}
          values={v.experience}
          onChange={(x) => set("experience", x)}
        />
      );
    case "planningScope":
      return (
        <CheckboxGroup
          options={PLANNING_SCOPE}
          values={v.planningScope}
          onChange={(x) => set("planningScope", x)}
        />
      );
    case "region":
      return (
        <TextInput
          value={v.region}
          onChange={(x) => set("region", x)}
          placeholder="예: 도쿄, 교토 근교"
          max={60}
        />
      );
    case "incType":
      return (
        <RadioGroup
          name="incType"
          options={INC_TYPE}
          value={v.incType}
          onChange={(x) => set("incType", x)}
        />
      );
    case "incDescription":
      return (
        <TextArea
          value={v.incDescription}
          onChange={(x) => set("incDescription", x)}
          max={300}
          rows={5}
        />
      );
    case "incTiming":
      return (
        <RadioGroup
          name="incTiming"
          options={INC_TIMING}
          value={v.incTiming}
          onChange={(x) => set("incTiming", x)}
        />
      );
    case "srcFirst":
      return (
        <RadioGroup
          name="srcFirst"
          options={SRC_OPTIONS}
          value={v.srcFirst}
          onChange={(x) => set("srcFirst", x)}
        />
      );
    case "srcNext":
      return (
        <OrderedPicker
          options={[
            ...SRC_OPTIONS.filter((o) => o.value !== v.srcFirst),
            { value: SRC_NEXT_NONE, label: SRC_NEXT_NONE_LABEL },
          ]}
          values={v.srcNext}
          onChange={(x) => set("srcNext", x)}
          max={SRC_NEXT_MAX}
          exclusive={SRC_NEXT_NONE}
        />
      );
    case "srcMoveReasons":
      return (
        <>
          <CheckboxGroup
            options={SRC_MOVE_REASON}
            values={v.srcMoveReasons}
            onChange={(x) => set("srcMoveReasons", x)}
            max={SRC_REASON_MAX}
          />
          <OtherInput
            show={v.srcMoveReasons.includes("other")}
            label="어떤 이유였는지 적어주세요."
            value={v.srcMoveReasonOther}
            onChange={(x) => set("srcMoveReasonOther", x)}
            max={120}
          />
        </>
      );
    case "srcMoveReasonOther":
      return null;
    case "impOutcomes":
      return (
        <>
          <CheckboxGroup
            options={IMP_OUTCOME}
            values={v.impOutcomes}
            onChange={(x) => set("impOutcomes", x)}
          />
          <OtherInput
            show={v.impOutcomes.includes("other")}
            label="어떤 내용인지 적어주세요."
            value={v.impOutcomeOther}
            onChange={(x) => set("impOutcomeOther", x)}
            max={120}
          />
        </>
      );
    case "impOutcomeOther":
      return null;
    case "impExtraTime":
      return (
        <RadioGroup
          name="impExtraTime"
          options={IMP_TIME}
          value={v.impExtraTime}
          onChange={(x) => set("impExtraTime", x)}
        />
      );
    case "altSufficientNote":
      return (
        <TextArea
          value={v.altSufficientNote}
          onChange={(x) => set("altSufficientNote", x)}
          max={200}
          rows={4}
        />
      );
    case "focus":
      return (
        <>
          <CheckboxGroup
            options={SMP_FOCUS}
            values={v.focus}
            onChange={(x) => set("focus", x)}
            max={SMP_FOCUS_MAX}
          />
          <OtherInput
            show={v.focus.includes("other")}
            label="어떤 조건인지 적어주세요."
            value={v.focusOther}
            onChange={(x) => set("focusOther", x)}
            max={80}
            single
          />
        </>
      );
    case "focusOther":
      return null;
    case "note":
      return (
        <TextArea
          value={v.note}
          onChange={(x) => set("note", x)}
          max={200}
          rows={4}
        />
      );
    case "neededBy":
      return (
        <TextInput
          type="date"
          value={v.neededBy}
          onChange={(x) => set("neededBy", x)}
          min={new Date().toISOString().slice(0, 10)}
        />
      );
    case "contact":
      return (
        <div className="grid gap-4">
          <TextInput
            type="email"
            inputMode="email"
            value={v.email}
            onChange={(x) => set("email", x)}
            placeholder="name@example.com"
          />
          <PrivacyTable rows={CONTACT_CONSENT.privacy} />
          <Check
            checked={v.consentSample}
            onChange={(x) => set("consentSample", x)}
          >
            {CONTACT_CONSENT.sampleConsent}
          </Check>
        </div>
      );
  }
}

/**
 * `기타`를 고른 자리에서 바로 적게 한다.
 * 별도 화면으로 넘기면 방금 무엇을 골랐는지 안 보여서 흐름이 끊긴다.
 */
function OtherInput({
  show,
  label,
  value,
  onChange,
  max,
  single,
}: {
  show: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  single?: boolean;
}) {
  if (!show) return null;
  return (
    <div className="mt-3 rounded-2xl bg-surface p-4">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {single ? (
        <TextInput value={value} onChange={onChange} max={max} />
      ) : (
        <TextArea value={value} onChange={onChange} max={max} rows={3} />
      )}
    </div>
  );
}

/**
 * 앞 답변을 가리키는 질문은 그 답을 화면에 다시 보여준다.
 * `첫 번째 정보`처럼 지시대명사만 있으면 응답자가 무엇을 가리키는지 기억해야 한다.
 */
function hintFor(key: QKey, v: Values): string | undefined {
  const first = v.srcFirst ? labelOf(SRC_OPTIONS, v.srcFirst) : null;

  if (key === "srcNext" && first) {
    return `가장 먼저 확인하신 곳은 ‘${first}’였습니다. 그 뒤에 확인한 곳을 순서대로 눌러주세요.`;
  }
  if (key === "srcMoveReasons" && first) {
    return `여기서 ‘첫 번째 정보’는 가장 먼저 확인하신 ‘${first}’에서 얻은 정보입니다. 그것만으로 충분했다면 그렇게 골라주셔도 됩니다.`;
  }
  return QUESTIONS[key].hint;
}

// ------------------------------------------------------------------ 공통 틀

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[42rem] px-6 py-8 sm:py-12">
      {children}
    </main>
  );
}

function Inquiry() {
  return (
    <div className="mt-8 border-t border-line pt-6 text-sm text-muted">
      <p>{INQUIRY.lead}</p>
      <p className="mt-1">이메일: {INQUIRY.email}</p>
    </div>
  );
}

/**
 * SO-01. 문제응답이 저장·잠금된 뒤에만 열린다.
 * 제출한 답변은 읽기 전용으로만 다시 볼 수 있다. (Q-057)
 */
function SolutionReveal({
  values,
  onRequest,
  onFinish,
}: {
  values: Values;
  onRequest: () => void;
  onFinish: () => void;
}) {
  const [showSubmitted, setShowSubmitted] = useState(false);

  useEffect(() => {
    void fetch("/api/solution", { method: "POST" });
  }, []);

  const upcoming = hasUpcomingTrip(values.experience);

  return (
    <Shell>
      <p className="mb-2 text-sm text-muted">여행 준비 경험이 저장됐습니다.</p>
      <h1 className="mb-4 text-2xl font-semibold leading-9">{SOLUTION.headline}</h1>
      <p className="mb-6 text-body">{SOLUTION.body}</p>

      <p className="mb-8 rounded-2xl bg-surface p-5 text-sm text-body">
        {SOLUTION.boundary}
      </p>

      {upcoming ? (
        <div className="grid gap-3">
          <PrimaryButton onClick={onRequest}>{SOLUTION.cta}</PrimaryButton>
          <QuietButton onClick={onFinish}>{SOLUTION.secondary}</QuietButton>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="rounded-2xl bg-weak p-5 text-sm text-weak-ink">
            {SOLUTION.noUpcomingTrip}
          </p>
          <QuietButton onClick={onFinish}>조사 마치기</QuietButton>
        </div>
      )}

      <div className="mt-8 border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setShowSubmitted((v) => !v)}
          className="text-sm text-muted underline underline-offset-4"
        >
          {showSubmitted ? "제출한 답변 접기" : SOLUTION.submittedTitle + " 보기"}
        </button>
        {showSubmitted ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-surface p-5 text-sm">
            <p className="text-muted">{SOLUTION.submittedNote}</p>
            <SubmittedRow label="여행 경험">
              {labelsOf(TRAVEL_EXPERIENCE, values.experience)}
            </SubmittedRow>
            <SubmittedRow label="직접 정한 것">
              {labelsOf(PLANNING_SCOPE, values.planningScope)}
            </SubmittedRow>
            <SubmittedRow label="도시·지역">{values.region || "—"}</SubmittedRow>
            <SubmittedRow label="상황">
              {values.incType ? labelOf(INC_TYPE, values.incType) : "—"}
            </SubmittedRow>
            <SubmittedRow label="첫 정보원">
              {values.srcFirst ? labelOf(SRC_OPTIONS, values.srcFirst) : "—"}
            </SubmittedRow>
            <SubmittedRow label="달라진 것">
              {labelsOf(IMP_OUTCOME, values.impOutcomes)}
            </SubmittedRow>
          </div>
        ) : null}
      </div>

      <Inquiry />
    </Shell>
  );
}

function SubmittedRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
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
    <Shell>
      <div className="py-10">
        <h1 className="mb-4 text-2xl font-semibold leading-9">{lines[0]}</h1>
        {lines.slice(1).map((line) => (
          <p key={line} className="mb-3 text-body">
            {line}
          </p>
        ))}
      </div>
      <Inquiry />
    </Shell>
  );
}
