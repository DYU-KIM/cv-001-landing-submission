/**
 * 계약서의 필수·분기·배타 규칙을 서버와 클라이언트가 같은 코드로 검사한다.
 * 클라이언트 검사는 편의이고, 저장 여부는 항상 서버 검사 결과로 정한다.
 */

import { z } from "zod";
import {
  ELIG_SCOPE,
  ELIG_STATUS,
  IMP_CHANGE_OUTCOMES,
  IMP_OUTCOME,
  IMP_TIME,
  INC_TIMING,
  INC_TYPE,
  SMP_FOCUS,
  SMP_FOCUS_MAX,
  SRC_MOVE_REASON,
  SRC_NEXT_MAX,
  SRC_NEXT_NONE,
  SRC_OPTIONS,
  SRC_REASON_ENOUGH,
  SRC_REASON_MAX,
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

const text = (min: number, max: number, message?: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => graphemeLength(s) >= min && graphemeLength(s) <= max, {
      message: message ?? `${min}자 이상 ${max}자 이하로 입력해주세요.`,
    });

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

export const consentSchema = z.object({
  consent: z.literal(true, { message: "참여 동의가 필요합니다." }),
  age: z.literal(true, { message: "만 18세 이상만 참여할 수 있습니다." }),
});

// ------------------------------------------------------------- SF-01 eligibility

export const eligibilitySchema = z.object({
  eligStatus: z.enum(values(ELIG_STATUS), { message: "한 가지를 선택해주세요." }),
  eligScope: z
    .array(z.enum(values(ELIG_SCOPE)))
    .min(1, "하나 이상 선택해주세요."),
  eligRegion: text(1, 60, "여행한 또는 여행할 도시·지역을 60자 이내로 적어주세요."),
});

export type EligibilityInput = z.infer<typeof eligibilitySchema>;

/** SF-01 Branch: 부적격 판정과 사유. 적격이면 null. */
export function ineligibleReason(input: EligibilityInput): string | null {
  if (input.eligStatus === "none") return "out_of_window";
  if (input.eligScope.length === 1 && input.eligScope[0] === "none")
    return "not_decision_maker";
  return null;
}

// ------------------------------------------------------------- SF-02 incident

export const incidentSchema = z
  .object({
    incType: z.enum(values(INC_TYPE), { message: "한 가지를 선택해주세요." }),
    incDescription: z.string().optional().default(""),
    incTiming: z.enum(values(INC_TIMING), { message: "한 가지를 선택해주세요." }),
  })
  .superRefine((v, ctx) => {
    // Branch: "특별히 다시 확인한 상황 없음"이면 서술을 받지 않는다. 그 외에는 필수다.
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
    neededBy: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해주세요."),
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

export const contactSchema = z.object({
  email: z.email("이메일 형식을 확인해주세요.").max(254),
  consentSample: z.literal(true, {
    message: "이메일 수집·이용 동의가 필요합니다.",
  }),
  consentFollowup: z.boolean().default(false),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ------------------------------------------------------------- helpers

/** SO-01 분기: 예정 여행이 있는 사람에게만 샘플 요청 CTA를 보여준다. */
export function hasUpcomingTrip(eligStatus: string | null | undefined): boolean {
  return eligStatus === "planning" || eligStatus === "both";
}

export function firstIssue(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
