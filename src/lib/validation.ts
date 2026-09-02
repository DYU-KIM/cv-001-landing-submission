/**
 * 계약서의 필수·분기·배타 규칙을 서버와 클라이언트가 같은 코드로 검사한다.
 * 클라이언트 검사는 편의이고, 저장 여부는 항상 서버 검사 결과로 정한다.
 *
 * SF-01의 상호배타 검사는 분류값의 모순만 막으며 응답자를 탈락시키지 않는다. (Q-058)
 * 나이·연령대 검증은 존재하지 않는다. (Q-059)
 */

import { z } from "zod";
import {
  IMP_CHANGE_OUTCOMES,
  IMP_OUTCOME,
  IMP_TIME,
  INC_TIMING,
  INC_TYPE,
  PLANNING_SCOPE,
  PLANNING_SCOPE_EXCLUSIVE,
  SMP_FOCUS,
  SMP_FOCUS_MAX,
  SRC_MOVE_REASON,
  SRC_NEXT_MAX,
  SRC_NEXT_NONE,
  SRC_OPTIONS,
  SRC_REASON_ENOUGH,
  SRC_REASON_MAX,
  TRAVEL_EXPERIENCE,
  TRAVEL_EXPERIENCE_NONE,
} from "./contract";

/**
 * 사용자가 인지하는 글자 수. 이모지·결합문자를 1자로 센다.
 * (contract SF-02 Text contract: "300자는 사용자가 인지하는 글자 기준으로 계산")
 */
export function graphemeLength(value: string): number {
  const trimmed = value.trim();
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("ko", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(trimmed)) n += 1;
    return n;
  }
  return [...trimmed].length;
}

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((o) => o.value) as [string, ...string[]];

const optionalText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => graphemeLength(s) <= max, {
      message: `${max}자 이하로 입력해주세요.`,
    })
    .optional()
    .or(z.literal(""));

// ------------------------------------------------------------- SF-00 consent

/** 필수 조사 동의 하나뿐이다. 나이 확인 체크박스는 만들지 않는다. */
export const consentSchema = z.object({
  consent: z.literal(true, { message: "참여 동의가 필요합니다." }),
});

// ------------------------------------------------------------- SF-01 travel context

export const travelContextSchema = z
  .object({
    experience: z
      .array(z.enum(values(TRAVEL_EXPERIENCE)))
      .min(1, "하나 이상 선택해주세요."),
    planningScope: z
      .array(z.enum(values(PLANNING_SCOPE)))
      .min(1, "하나 이상 선택해주세요."),
    region: optionalText(60),
  })
  .superRefine((v, ctx) => {
    if (
      v.experience.includes(TRAVEL_EXPERIENCE_NONE) &&
      v.experience.length > 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["experience"],
        message:
          "‘아직 구체적인 준비·경험 없음’은 다른 항목과 함께 선택할 수 없습니다.",
      });
    }

    const exclusive = v.planningScope.filter((s) =>
      (PLANNING_SCOPE_EXCLUSIVE as readonly string[]).includes(s),
    );
    if (exclusive.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["planningScope"],
        message:
          "‘직접 정한 것이 거의 없음’과 ‘아직 해당 없음’은 함께 선택할 수 없습니다.",
      });
    }
    if (exclusive.length === 1 && v.planningScope.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["planningScope"],
        message: `‘${
          PLANNING_SCOPE.find((o) => o.value === exclusive[0])?.label
        }’은 구체적인 항목과 함께 선택할 수 없습니다.`,
      });
    }
  });

export type TravelContextInput = z.infer<typeof travelContextSchema>;

/**
 * SO-01 분기. 구체적으로 준비 중인 사람에게만 샘플 신청 CTA를 보여준다.
 * 자격 판정이 아니라 화면 분기이며, 문제조사는 누구도 종료시키지 않는다.
 */
export function hasUpcomingTrip(
  experience: readonly string[] | null | undefined,
): boolean {
  return (experience ?? []).includes("preparing");
}

// ------------------------------------------------------------- SF-02 incident

export const incidentSchema = z
  .object({
    incType: z.enum(values(INC_TYPE), { message: "한 가지를 선택해주세요." }),
    incDescription: z.string().optional().default(""),
    incTiming: z.enum(values(INC_TIMING), { message: "한 가지를 선택해주세요." }),
  })
  .superRefine((v, ctx) => {
    if (v.incType === "none") return;
    const n = graphemeLength(v.incDescription);
    if (n < 10 || n > 300) {
      ctx.addIssue({
        code: "custom",
        path: ["incDescription"],
        message:
          "어떤 장소·조건을 두고 무엇을 결정하려 했는지 10자 이상 300자 이하로 적어주세요.",
      });
    }
  });

export type IncidentInput = z.infer<typeof incidentSchema>;

// ------------------------------------------------------------- SF-03 sources

export const sourcesSchema = z
  .object({
    srcFirst: z.enum(values(SRC_OPTIONS), { message: "한 가지를 선택해주세요." }),
    srcNext: z
      .array(z.enum([...values(SRC_OPTIONS), SRC_NEXT_NONE]))
      .max(SRC_NEXT_MAX, `최대 ${SRC_NEXT_MAX}개까지 선택할 수 있습니다.`)
      .default([]),
    srcMoveReasons: z
      .array(z.enum(values(SRC_MOVE_REASON)))
      .min(1, "하나 이상 선택해주세요.")
      .max(SRC_REASON_MAX, `최대 ${SRC_REASON_MAX}개까지 선택할 수 있습니다.`),
    srcMoveReasonOther: z.string().optional().default(""),
  })
  .superRefine((v, ctx) => {
    const hasNone = v.srcNext.includes(SRC_NEXT_NONE);
    if (hasNone && v.srcNext.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["srcNext"],
        message: "‘추가로 확인하지 않음’은 다른 출처와 함께 선택할 수 없습니다.",
      });
    }
    if (v.srcNext.includes(v.srcFirst)) {
      ctx.addIssue({
        code: "custom",
        path: ["srcNext"],
        message: "가장 먼저 확인한 곳은 다시 선택할 수 없습니다.",
      });
    }
    if (new Set(v.srcNext).size !== v.srcNext.length) {
      ctx.addIssue({
        code: "custom",
        path: ["srcNext"],
        message: "같은 출처를 중복해서 선택할 수 없습니다.",
      });
    }
    const enough = v.srcMoveReasons.includes(SRC_REASON_ENOUGH);
    if (enough && v.srcMoveReasons.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["srcMoveReasons"],
        message:
          "‘첫 번째 정보만으로 충분했다’는 부족했던 이유와 함께 선택할 수 없습니다.",
      });
    }
    if (v.srcMoveReasons.includes("other")) {
      const n = graphemeLength(v.srcMoveReasonOther);
      if (n < 1 || n > 120) {
        ctx.addIssue({
          code: "custom",
          path: ["srcMoveReasonOther"],
          message: "기타 이유를 120자 이내로 적어주세요.",
        });
      }
    }
  });

export type SourcesInput = z.infer<typeof sourcesSchema>;

// ------------------------------------------------------------- SF-04 impact

export const impactSchema = z
  .object({
    impOutcomes: z
      .array(z.enum(values(IMP_OUTCOME)))
      .min(1, "하나 이상 선택해주세요."),
    impOutcomeOther: z.string().optional().default(""),
    impExtraTime: z.enum(values(IMP_TIME)).optional().or(z.literal("")),
    altSufficientNote: optionalText(200),
  })
  .superRefine((v, ctx) => {
    const changes = v.impOutcomes.filter((o) =>
      (IMP_CHANGE_OUTCOMES as readonly string[]).includes(o),
    );
    if (v.impOutcomes.includes("nothing") && changes.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["impOutcomes"],
        message:
          "‘특별히 달라진 것은 없었다’는 변경·포기·추가비용과 함께 선택할 수 없습니다.",
      });
    }
    if (v.impOutcomes.includes("other")) {
      const n = graphemeLength(v.impOutcomeOther);
      if (n < 1 || n > 120) {
        ctx.addIssue({
          code: "custom",
          path: ["impOutcomeOther"],
          message: "기타 내용을 120자 이내로 적어주세요.",
        });
      }
    }
  });

export type ImpactInput = z.infer<typeof impactSchema>;

// ------------------------------------------------------------- SR-01 sample

export const sampleSchema = z
  .object({
    focus: z
      .array(z.enum(values(SMP_FOCUS)))
      .min(1, "하나 이상 선택해주세요.")
      .max(SMP_FOCUS_MAX, `최대 ${SMP_FOCUS_MAX}개까지 선택할 수 있습니다.`),
    focusOther: z.string().optional().default(""),
    note: optionalText(200),
    neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해주세요."),
  })
  .superRefine((v, ctx) => {
    if (v.focus.includes("other")) {
      const n = graphemeLength(v.focusOther);
      if (n < 1 || n > 80) {
        ctx.addIssue({
          code: "custom",
          path: ["focusOther"],
          message: "기타 조건을 80자 이내로 적어주세요.",
        });
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${v.neededBy}T00:00:00`) < today) {
      ctx.addIssue({
        code: "custom",
        path: ["neededBy"],
        message: "지난 날짜는 선택할 수 없습니다.",
      });
    }
  });

export type SampleInput = z.infer<typeof sampleSchema>;

// ------------------------------------------------------------- SR-02 contact

/** 후속 사용조사 동의는 만들지 않는다. (Q-052) */
export const contactSchema = z.object({
  email: z.email("이메일 형식을 확인해주세요.").max(254),
  consentSample: z.literal(true, {
    message: "이메일 수집·이용 동의가 필요합니다.",
  }),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ------------------------------------------------------------- helpers

export function firstIssue(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
