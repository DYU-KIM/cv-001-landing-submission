/**
 * CV-001 랜딩·설문 문구와 선택지의 단일 출처.
 *
 * 원본 계약서: project-docs/projects/local-travel-info-marketplace/01-research/cv-001/LANDING-FORM-CONTRACT-KO.md
 * 결정 근거: 같은 저장소 02-product/QUESTIONS.md 의 Q-052 ~ Q-059
 *
 * 문구를 바꿀 때는 계약서를 먼저 고치고 여기에 반영한다. 코드에서 임의로 새 문구를 만들지 않는다.
 */

export const LANDING_VERSION = "v2";

/**
 * 공개 문의 이메일. 배포 전 실제 주소로 교체한다. (계약서 Manual inquiry handling)
 * 고객 화면에는 일반 문의 안내와 이 주소만 표시하고, 삭제코드·삭제 링크는 만들지 않는다.
 */
export const INQUIRY_EMAIL =
  process.env.NEXT_PUBLIC_INQUIRY_EMAIL ?? "<SET_BEFORE_RELEASE>";

/**
 * 보유기간. (Q-054)
 * 인원·추첨일·제공기한·샘플 구성은 Founder 운영값이므로 여기에 두지 않는다. (Q-055)
 */
export const RETENTION = {
  partialDays: 30,
  completedMonths: 12,
  contactDays: 30,
} as const;

// ------------------------------------------------------------------ LP-01

export const LANDING = {
  eyebrow: "일본 자유여행 준비 경험 조사",
  headline: "일본 자유여행,\n실제로 어떻게 준비하셨나요?",

  /** 무엇을 묻는 조사인지 한 문장. */
  subhead:
    "일본 자유여행을 준비하며 장소·일정·교통정보를 어떤 순서로 찾고 정하셨는지 듣는 조사입니다.",

  /** 참여하면 무엇을 받는지. 추첨 안내는 여기서 한 번만 한다. */
  offer:
    "조사를 마치면 여행정보 샘플 테스트에 신청할 수 있습니다. 신청자 중 추첨으로 선정된 분께 실제 샘플을 드립니다.",

  cta: "내 여행 준비 경험 남기기",
  ctaNote: "약 2~3분 · 이메일은 샘플 신청하시는 분만",

  /** 가장 큰 의심 하나에만 답한다. "왜 공짜냐" 외의 질문은 아래 두 섹션이 답한다. */
  reward: {
    title: "왜 무료인가요",
    lead: "아직 파는 물건이 아니기 때문입니다.",
    lines: [
      "정식 서비스 출시 전 검증 단계입니다.",
      "여행 시기와 지역에 맞춰 한 분씩 만듭니다.",
      "직접 확인한 내용과 출처만 담습니다.",
    ],
  },

  steps: [
    { title: "준비 경험 남기기", desc: "어떻게 찾고 정했는지 답합니다." },
    { title: "샘플 신청하기", desc: "여행 조건을 남기고 신청합니다." },
    { title: "추첨 후 안내", desc: "선정된 분께 이메일로 알려드립니다." },
  ],


  asks: [
    "정보를 가장 많이 다시 확인했던 상황 한 가지",
    "그때 어디에서 찾았고 어떤 순서로 옮겼는지",
    "확인한 뒤 실제로 무엇이 달라졌는지",
  ],
  asksNote: "정답이 없는 질문입니다. 편하게 답해주시면 됩니다.",

  finalCta: "일본 여행 준비, 어떻게 하셨는지 들려주세요.",

  /** 푸터. 개인정보 고지 전문은 동의 화면에 있으므로 여기서는 두 줄만 남긴다. */
  footerNotes: [
    "정식 서비스가 아니라 검증 단계의 조사입니다.",
    "이름과 전화번호는 묻지 않습니다. 중도 이탈 응답은 30일, 완료된 응답은 12개월 뒤 파기합니다.",
  ],
} as const;

// ------------------------------------------------------------------ SF-00

export const CONSENT = {
  /**
   * 정답이 없는 조사임을 밝히는 한 줄만 남긴다.
   * 임시저장·부분응답 설명은 아래 보유기간 항목과 겹쳐서 뺐다.
   */
  intro: ["정답이 없는 조사입니다. 서비스 평가나 구매 의향은 묻지 않습니다."],

  /**
   * 개인정보 수집 동의의 법정 고지 네 가지.
   * 목적·수집항목·보유기간·거부권과 불이익은 어느 하나도 뺄 수 없다.
   */
  privacy: [
    {
      item: "목적",
      notice: "일본 자유여행 준비 과정의 정보탐색 행동 분석",
    },
    {
      item: "수집항목",
      notice:
        "여행 상태·지역·계획 범위, 정보탐색 경험 응답, 페이지 버전·유입 코드·기기 유형",
    },
    {
      item: "보유기간",
      notice: "중도 이탈은 30일, 완료 응답은 12개월 뒤 파기",
    },
    {
      item: "거부권",
      notice:
        "동의하지 않으면 참여할 수 없습니다. 참여하지 않아도 불이익은 없습니다",
    },
  ],

  freeTextWarning:
    "자유서술에는 이름, 전화번호, 예약번호, 정확한 숙소 주소 등 본인이나 다른 사람을 알아볼 수 있는 정보를 적지 마세요.",

  consentLabel:
    "조사 목적, 수집항목, 보유기간, 동의 거부 시 영향을 확인했고 참여에 동의합니다.",

  submit: "동의하고 시작하기",
} as const;

/** 고객 화면 문의 안내. 삭제 전용 문구를 덧붙이지 않는다. (Q-056) */
export const INQUIRY = {
  lead: "조사 참여 및 개인정보 처리에 관한 문의는 아래 이메일로 연락해주세요.",
  email: INQUIRY_EMAIL,
} as const;

// ------------------------------------------------------------------ SF-01

/** Q-CONTEXT-01. 자격심사가 아니라 사후 분류값이다. (Q-058) */
export const TRAVEL_EXPERIENCE = [
  { value: "preparing", label: "현재 준비 중" },
  { value: "within_1y", label: "다녀온 지 1년 이내" },
  { value: "y1_to_3", label: "다녀온 지 1~3년" },
  { value: "over_3y", label: "다녀온 지 3년 초과" },
  { value: "none", label: "아직 구체적인 준비·경험 없음" },
] as const;

export const TRAVEL_EXPERIENCE_NONE = "none";

/** Q-CONTEXT-02. */
export const PLANNING_SCOPE = [
  { value: "places", label: "방문 장소" },
  { value: "food", label: "음식점·카페" },
  { value: "stay", label: "숙소" },
  { value: "transit", label: "교통·이동" },
  { value: "itinerary", label: "일정" },
  { value: "booking", label: "예약" },
  { value: "few", label: "직접 정한 것이 거의 없음" },
  { value: "not_yet", label: "아직 해당 없음" },
] as const;

/** 구체적인 계획 항목과 동시에 선택할 수 없고, 서로도 함께 고를 수 없다. */
export const PLANNING_SCOPE_EXCLUSIVE = ["few", "not_yet"] as const;

// ------------------------------------------------------------------ SF-02

export const INC_TYPE = [
  { value: "local_area", label: "로컬·외곽 장소" },
  { value: "hours", label: "영업시간·휴무·예약" },
  { value: "season", label: "계절·날씨·방문시간" },
  { value: "transit", label: "교통·동선" },
  { value: "stay_location", label: "숙소 위치" },
  { value: "none", label: "특별히 다시 확인한 상황 없음" },
  { value: "other", label: "기타" },
] as const;

export const INC_TIMING = [
  { value: "before", label: "여행 전 준비 중" },
  { value: "during", label: "여행 중 현지에서" },
  { value: "after", label: "여행 후 다음 여행을 위해" },
] as const;

export const INC_DESCRIPTION_EXAMPLE =
  "예: “11월에 교토 외곽 카페에 대중교통으로 갈 수 있는지 결정하려고 했다.”";

// ------------------------------------------------------------------ SF-03

export const SRC_OPTIONS = [
  { value: "naver_blog", label: "네이버 블로그" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "google_maps", label: "Google Maps" },
  { value: "jp_local", label: "일본 현지 사이트·블로그" },
  { value: "official", label: "관광청·시설 공식 사이트" },
  { value: "travel_app", label: "여행 앱" },
  { value: "ai", label: "AI 서비스" },
  { value: "book", label: "책·가이드북" },
  { value: "people", label: "지인·현지인" },
  { value: "other", label: "기타" },
] as const;

export const SRC_NEXT_NONE = "no_more";
export const SRC_NEXT_NONE_LABEL = "추가로 확인하지 않음";
export const SRC_NEXT_MAX = 3;

export const SRC_MOVE_REASON = [
  { value: "outdated", label: "정보가 오래된 것 같았다" },
  { value: "ad", label: "광고·협찬인지 판단하기 어려웠다" },
  { value: "local_real", label: "현지인이 실제로 이용하는 곳인지 알기 어려웠다" },
  { value: "hours", label: "영업시간·휴무가 불분명했다" },
  { value: "booking", label: "예약방법을 알기 어려웠다" },
  { value: "transit", label: "교통·이동방법이 부족했다" },
  { value: "season", label: "계절·날씨·방문시간에 맞는지 알기 어려웠다" },
  { value: "conflict", label: "출처마다 정보가 달랐다" },
  { value: "better", label: "더 좋은 선택지가 있는지 확인하고 싶었다" },
  { value: "enough", label: "첫 번째 정보만으로 충분했다" },
  { value: "other", label: "기타" },
] as const;

export const SRC_REASON_ENOUGH = "enough";
export const SRC_REASON_MAX = 3;

// ------------------------------------------------------------------ SF-04

export const IMP_OUTCOME = [
  { value: "kept", label: "원래 장소·계획을 그대로 선택했다" },
  { value: "changed_place", label: "다른 장소로 변경했다" },
  { value: "gave_up", label: "방문을 포기했다" },
  { value: "changed_order", label: "일정 순서를 변경했다" },
  { value: "changed_transit", label: "교통수단을 변경했다" },
  { value: "extra_booking", label: "추가 예약·문의를 했다" },
  { value: "extra_cost", label: "추가 비용이 들었다" },
  { value: "nothing", label: "특별히 달라진 것은 없었다" },
  { value: "unknown_yet", label: "아직 여행 전이라 최종 결과를 모른다" },
  { value: "other", label: "기타" },
] as const;

export const IMP_CHANGE_OUTCOMES = [
  "changed_place",
  "gave_up",
  "changed_order",
  "changed_transit",
  "extra_booking",
  "extra_cost",
] as const;

export const IMP_TIME = [
  { value: "lt10", label: "10분 미만" },
  { value: "10_30", label: "10~30분" },
  { value: "30_60", label: "30분~1시간" },
  { value: "1_3h", label: "1~3시간" },
  { value: "gt3h", label: "3시간 이상" },
  { value: "unknown", label: "기억나지 않음" },
] as const;

// ------------------------------------------------------------------ SO-01

export const SOLUTION = {
  savedNote: "여행 준비 경험이 저장됐습니다.",

  /** 매달린 조건절 대신 완결된 문장으로 둔다. */
  headline: "여행 조건에 맞춘 정보 한 장,\n무료로 만들어 드립니다",
  body: "조사를 마치신 분은 샘플 테스트에 신청할 수 있습니다.",

  /**
   * 추첨과 범위 밖 항목만 남긴다.
   * 여행 시점이나 요청 순서를 선정 우선순위로 쓰지 않는다. (Q-060)
   * 모든 문제조사 완료자가 같은 화면을 본다.
   */
  pointsTitle: "알아두실 점",
  points: [
    "신청자 중 추첨으로 선정된 분에게만 이메일로 안내합니다.",
    "예약 대행, 전체 일정 제작, 실시간 영업 보장은 포함하지 않습니다.",
  ],
  cta: "내 여행 조건으로 샘플 요청하기",
  secondary: "요청하지 않고 조사 마치기",
  submittedTitle: "제출한 답변",
  submittedNote: "제출이 완료되어 답변은 수정할 수 없습니다.",
} as const;

// ------------------------------------------------------------------ SR-01

export const SMP_FOCUS = [
  { value: "local_mood", label: "현지 분위기의 장소" },
  { value: "hours", label: "영업·휴무 최신정보" },
  { value: "transit", label: "대중교통 접근성" },
  { value: "season", label: "계절·날씨 적합성" },
  { value: "ad_check", label: "광고·협찬 여부 판단" },
  { value: "booking", label: "예약방법" },
  { value: "route", label: "여행 동선" },
  { value: "other", label: "기타" },
] as const;

export const SMP_FOCUS_MAX = 2;

// ------------------------------------------------------------------ SR-02

export const CONTACT_CONSENT = {
  emailLabel: "샘플을 받을 이메일",
  sampleConsent: "샘플 제공을 위한 이메일 수집·이용에 동의합니다.",
  submit: "정보 샘플 요청 제출하기",

  /** 계약서 SR-02 Required privacy summary */
  privacy: [
    { item: "목적", notice: "샘플 추첨 진행, 선정 결과 안내와 선정자 샘플 제공" },
    { item: "수집항목", notice: "이메일, 샘플 요청 조건과 필요한 시점" },
    {
      item: "보유기간",
      notice: "미선정자는 추첨일 후 30일, 선정자는 샘플 제공일 후 30일",
    },
    {
      item: "거부권과 영향",
      notice:
        "동의하지 않을 수 있으며, 거부하면 샘플 추첨에는 신청할 수 없지만 완료한 문제조사 응답에는 영향이 없습니다",
    },
  ],
} as const;

// ------------------------------------------------------------------ 종료 화면

export const EXIT = {
  surveyOnly:
    "여행 준비 경험을 남겨주셔서 감사합니다. 응답은 일본 자유여행 정보탐색 과정을 분석하는 데 사용됩니다.",
  requested: [
    "요청이 접수됐습니다.",
    "신청자 중 추첨을 통해 선정된 분에게 입력한 이메일로 안내드리겠습니다. 신청한다고 모두 제공받는 것은 아닙니다.",
  ],
} as const;

// ------------------------------------------------------------------ helpers

export type Option = { value: string; label: string };

export function labelOf(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function labelsOf(
  options: readonly Option[],
  values: readonly string[] | null | undefined,
): string {
  if (!values || values.length === 0) return "—";
  return values.map((v) => labelOf(options, v)).join(", ");
}
