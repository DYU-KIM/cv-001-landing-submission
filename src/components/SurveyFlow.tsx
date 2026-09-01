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
  OrderedPicker,
  PrimaryButton,
  QuietButton,
  RadioGroup,
  SaveError,
  TextArea,
  TextInput,
} from "./fields";

type Phase = "problem" | "sample";
type Step =
  | "consent"
  | "q"
  | "solution"
  | "ineligible"
  | "doneSurvey"
  | "doneRequest";

type Group = "eligibility" | "incident" | "sources" | "impact" | "sample" | "contact";

type QKey =
  | "eligStatus"
  | "eligScope"
  | "eligRegion"
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

/**
 * 한 화면에 질문 하나만 보여준다.
 * 조건부 질문은 앞 답변에 따라 목록에서 빠지므로 진행률도 함께 줄어든다.
 * 서버 저장은 계약서대로 SF-01~SF-04 단위(그룹의 마지막 질문)에서 이뤄진다.
 */
function screensFor(values: Values, phase: Phase): Screen[] {
  if (phase === "sample") {
    const screens: Screen[] = [{ group: "sample", key: "focus" }];
    if (values.focus.includes("other"))
      screens.push({ group: "sample", key: "focusOther" });
    screens.push(
      { group: "sample", key: "note" },
      { group: "sample", key: "neededBy" },
      { group: "contact", key: "contact" },
    );
    return screens;
  }

  const screens: Screen[] = [
    { group: "eligibility", key: "eligStatus" },
    { group: "eligibility", key: "eligScope" },
    { group: "eligibility", key: "eligRegion" },
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
  if (values.srcMoveReasons.includes("other"))
    screens.push({ group: "sources", key: "srcMoveReasonOther" });
  screens.push({ group: "impact", key: "impOutcomes" });
  if (values.impOutcomes.includes("other"))
    screens.push({ group: "impact", key: "impOutcomeOther" });
  screens.push(
    { group: "impact", key: "impExtraTime" },
    { group: "impact", key: "altSufficientNote" },
  );
  return screens;
}

const GROUP_SCHEMA = {
  eligibility: eligibilitySchema,
  incident: incidentSchema,
  sources: sourcesSchema,
  impact: impactSchema,
  sample: sampleSchema,
  contact: contactSchema,
} as const;

function groupValues(group: Group, v: Values): Record<string, unknown> {
  switch (group) {
    case "eligibility":
      return {
        eligStatus: v.eligStatus,
        eligScope: v.eligScope,
        eligRegion: v.eligRegion,
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
      return {
        email: v.email,
        consentSample: v.consentSample,
        consentFollowup: v.consentFollowup,
      };
  }
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
  const retry = useRef<(() => void) | null>(null);

  // 같은 탭 새로고침 복원 + 랜딩에서 고른 첫 답변 반영
  useEffect(() => {
    let next = { ...EMPTY };
    let restoredStep: Step = "consent";
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          step: Step;
          phase: Phase;
          cursor: number;
          values: Values;
        };
        next = { ...EMPTY, ...draft.values };
        restoredStep = draft.step;
        setPhase(draft.phase ?? "problem");
        setCursor(draft.cursor ?? 0);
      }
    } catch {
      // 복원 실패는 조사 진행을 막지 않는다.
    }

    if (!next.eligStatus) {
      const picked = new URLSearchParams(window.location.search).get("s");
      if (picked && ELIG_STATUS.some((o) => o.value === picked)) {
        next.eligStatus = picked;
      }
    }

    setValues(next);
    setStep(restoredStep);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, phase, cursor, values }),
      );
    } catch {
      // 저장 공간이 없어도 진행은 계속한다.
    }
  }, [step, phase, cursor, values, restored]);

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
          />
        ) : null}

        <h1 className="mb-4 text-2xl font-bold">조사 안내와 동의</h1>
        {CONSENT.intro.map((line) => (
          <p key={line} className="mb-3 text-muted">
            {line}
          </p>
        ))}

        <div className="my-6 rounded-2xl bg-soft p-5 text-sm text-muted">
          <p className="mb-1">{CONSENT.purpose}</p>
          <p className="mb-1">{CONSENT.items}</p>
          <p className="mb-1">{CONSENT.retention}</p>
          <p className="mb-1">{CONSENT.refusal}</p>
          <p>문의·삭제 요청: {CONTACT_EMAIL}</p>
        </div>

        <div className="mb-4 grid gap-2">
          <Check checked={values.consent} onChange={(v) => set("consent", v)}>
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
          onClick={() => {
            const parsed = consentSchema.safeParse({
              consent: values.consent,
              age: values.age,
            });
            if (!parsed.success) {
              setErrors(firstIssue(parsed.error));
              return;
            }
            setErrors({});
            void run(
              () =>
                post("/api/consent", {
                  consent: values.consent,
                  age: values.age,
                }),
              () => {
                void fetch("/api/event", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ event: "form_started" }),
                });
                // 랜딩에서 첫 질문에 답했으면 그 화면은 건너뛴다.
                setCursor(values.eligStatus ? 1 : 0);
                setStep("q");
              },
            );
          }}
        >
          {saving ? "저장하는 중…" : "동의하고 시작하기"}
        </PrimaryButton>
      </Shell>
    );
  }

  // ---------------------------------------------------------------- 종료 화면

  if (step === "ineligible") return <Closing lines={[EXIT.ineligible]} />;
  if (step === "doneSurvey") return <Closing lines={[EXIT.surveyOnly]} />;
  if (step === "doneRequest") return <Closing lines={[...EXIT.requested]} />;

  // ---------------------------------------------------------------- 해결책

  if (step === "solution") {
    return (
      <SolutionReveal
        eligStatus={values.eligStatus}
        region={values.eligRegion}
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
      // 마지막 질문에서는 그룹 전체를, 중간에서는 지금 보이는 질문만 막는다.
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
            consentFollowup: values.consentFollowup,
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
        if (data.next === "ineligible") {
          setStep("ineligible");
          return;
        }
        if (data.next === "solution") {
          setStep("solution");
          return;
        }
        setCursor(cursor + 1);
      },
    );
  };

  const q = QUESTIONS[current.key];
  const lastLabel =
    current.group === "contact"
      ? CONTACT_CONSENT.submit
      : current.group === "impact" && isLastOfGroup
        ? "여행 준비 경험 제출하기"
        : "다음";

  return (
    <Shell>
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>{phase === "sample" ? "샘플 요청" : "여행 준비 경험"}</span>
          <span>
            {cursor + 1} / {screens.length}
          </span>
        </div>
        <div className="h-1 w-full rounded bg-soft">
          <div
            className="h-1 rounded bg-accent transition-all duration-300"
            style={{ width: `${((cursor + 1) / screens.length) * 100}%` }}
          />
        </div>
      </div>

      {saveError ? (
        <SaveError
          message={saveError}
          retrying={saving}
          onRetry={() => retry.current?.()}
        />
      ) : null}

      <h1 className="mb-2 text-[1.6rem] font-bold leading-snug">
        {q.label}
        {q.optional ? (
          <span className="ml-2 align-middle text-sm font-normal text-muted">
            선택
          </span>
        ) : null}
      </h1>
      {q.hint ? <p className="mb-6 text-muted">{q.hint}</p> : <div className="mb-6" />}

      <div className="mb-8">{renderInput(current.key, values, set)}</div>

      {errors[current.key] ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errors[current.key]}
        </p>
      ) : null}
      {isLastOfGroup &&
      Object.keys(errors).some((k) => k !== current.key) ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {Object.entries(errors).find(([k]) => k !== current.key)?.[1]}
        </p>
      ) : null}

      <PrimaryButton disabled={saving} onClick={advance}>
        {saving ? "저장하는 중…" : lastLabel}
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
  eligStatus: { label: "현재 어떤 상황에 해당하나요?" },
  eligScope: {
    label: "이 여행에서 직접 정했거나 정하고 있는 것은 무엇인가요?",
    hint: "해당하는 것을 모두 골라주세요.",
  },
  eligRegion: {
    label: "여행한 또는 여행할 일본의 도시·지역은 어디인가요?",
    hint: "여러 곳이면 함께 적으셔도 됩니다.",
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
    case "eligStatus":
      return (
        <RadioGroup
          name="eligStatus"
          options={ELIG_STATUS}
          value={v.eligStatus}
          onChange={(x) => set("eligStatus", x)}
        />
      );
    case "eligScope":
      return (
        <CheckboxGroup
          options={ELIG_SCOPE}
          values={v.eligScope}
          onChange={(x) => set("eligScope", x)}
        />
      );
    case "eligRegion":
      return (
        <TextInput
          value={v.eligRegion}
          onChange={(x) => set("eligRegion", x)}
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
        <CheckboxGroup
          options={SRC_MOVE_REASON}
          values={v.srcMoveReasons}
          onChange={(x) => set("srcMoveReasons", x)}
          max={SRC_REASON_MAX}
        />
      );
    case "srcMoveReasonOther":
      return (
        <TextArea
          value={v.srcMoveReasonOther}
          onChange={(x) => set("srcMoveReasonOther", x)}
          max={120}
          rows={3}
        />
      );
    case "impOutcomes":
      return (
        <CheckboxGroup
          options={IMP_OUTCOME}
          values={v.impOutcomes}
          onChange={(x) => set("impOutcomes", x)}
        />
      );
    case "impOutcomeOther":
      return (
        <TextArea
          value={v.impOutcomeOther}
          onChange={(x) => set("impOutcomeOther", x)}
          max={120}
          rows={3}
        />
      );
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
        <CheckboxGroup
          options={SMP_FOCUS}
          values={v.focus}
          onChange={(x) => set("focus", x)}
          max={SMP_FOCUS_MAX}
        />
      );
    case "focusOther":
      return (
        <TextInput
          value={v.focusOther}
          onChange={(x) => set("focusOther", x)}
          max={80}
        />
      );
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
          <p className="rounded-2xl bg-soft p-4 text-sm text-muted">
            {CONTACT_CONSENT.retentionNote}
          </p>
          <div className="grid gap-2">
            <Check
              checked={v.consentSample}
              onChange={(x) => set("consentSample", x)}
            >
              {CONTACT_CONSENT.sampleConsent}
            </Check>
            <Check
              checked={v.consentFollowup}
              onChange={(x) => set("consentFollowup", x)}
            >
              {CONTACT_CONSENT.followupConsent}{" "}
              <span className="text-muted">(선택)</span>
            </Check>
          </div>
        </div>
      );
  }
}

// ------------------------------------------------------------------ 공통 틀

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[42rem] px-5 py-10 sm:py-14">
      {children}
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
    <Shell>
      <p className="mb-2 text-sm text-muted">여행 준비 경험이 저장됐습니다.</p>
      <h1 className="mb-4 text-2xl font-bold">{SOLUTION.headline}</h1>
      <p className="mb-6 text-muted">{SOLUTION.body}</p>

      <div className="mb-6 rounded-2xl border border-line p-5">
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
          <p className="rounded-2xl bg-soft p-4 text-sm text-muted">
            {SOLUTION.noUpcomingTrip}
          </p>
          <QuietButton onClick={onFinish}>조사 마치기</QuietButton>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        {labelOf(ELIG_STATUS, eligStatus)}
      </p>
    </Shell>
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
        <h1 className="mb-4 text-2xl font-bold">{lines[0]}</h1>
        {lines.slice(1).map((line) => (
          <p key={line} className="mb-3 text-muted">
            {line}
          </p>
        ))}
        <p className="mt-8 text-sm text-muted">
          문의·삭제 요청: {CONTACT_EMAIL}
        </p>
      </div>
    </Shell>
  );
}
