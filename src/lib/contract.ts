/**
 * CV-001 랜딩·설문 문구와 선택지의 단일 출처.
 *
 * 원본 계약서: project-docs/projects/local-travel-info-marketplace/01-research/cv-001/LANDING-FORM-CONTRACT-KO.md
 * 문구를 바꿀 때는 계약서를 먼저 고치고 여기에 반영한다. 코드에서 임의로 새 문구를 만들지 않는다.
 */

export const LANDING_VERSION = "v1";

/** D-PRIVACY-01 (2026-09-01): 전 저장소 12개월 보관 후 파기, 요청 시 즉시 삭제. */
export const RETENTION_MONTHS = 12;

/** D-SAMPLE-01 (2026-09-01): 장소 3곳 구성, 주당 최대 5건 수동 제작. */
export const SAMPLE_PLACE_COUNT = 3;

/** D-LOCK-01 (2026-09-01): 해결책 공개 후 문제 응답 잠금. */
export const LOCK_PROBLEM_AFTER_SOLUTION = true;

/** 운영 문의·삭제 요청을 받을 주소. 배포 전 실제 주소로 교체한다. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "<SET_BEFORE_LAUNCH>";

// ------------------------------------------------------------------ LP-01

export const LANDING = {
  eyebrow: "일본 자유여행 준비 경험 조사",
  headline: "일본 자유여행, 실제로 어떻게 준비하셨나요?",
  body: [
    "최근 일본 자유여행을 다녀왔거나 현재 직접 준비 중인 분들이 장소·일정·교통정보를 어떤 순서로 찾고 결정하는지 조사하고 있습니다.",
    "약 3~4분이 걸립니다. 여행 준비 경험을 먼저 제출한 뒤, 원하는 분은 자신의 여행조건에 맞춘 정보 샘플을 요청할 수 있습니다.",
  ],
  cta: "내 여행 준비 경험 남기기",
  qualification:
    "만 18세 이상이며, 최근 12개월 안에 일본 자유여행을 다녀왔거나 3개월 안에 여행을 계획하고 직접 정보를 찾아본 분을 대상으로 합니다.",
  notice: [
    "정식 서비스가 아니라 검증 단계의 조사입니다.",
    "조사를 마친 뒤에만 정보 샘플을 요청할 수 있습니다.",
  ],
} as const;

// ------------------------------------------------------------------ SF-00

export const CONSENT = {
  intro: [
    "이 조사는 일본 자유여행 준비 과정의 실제 정보탐색 행동을 이해하기 위한 것입니다. 정답은 없으며, 서비스에 긍정적인 평가를 요구하지 않습니다.",
    "‘다음’을 누를 때마다 완료한 단계까지 임시 저장됩니다. 중간에 나가면 저장된 부분 응답은 조사 이탈과 질문 개선 분석에만 사용하며, 유효 완료 응답과 구분합니다.",
  ],
  purpose: "수집 목적: 일본 자유여행 정보탐색 행동 조사와 정보 샘플 제공",
  items:
    "수집 항목: 여행 시기·지역, 정보탐색 경험 응답, 접속 환경 정보 (샘플을 요청하는 경우에만 이메일)",
  retention: `보유 기간: 수집일로부터 ${RETENTION_MONTHS}개월간 보관 후 파기하며, 요청하시면 즉시 삭제합니다.`,
  refusal:
    "동의를 거부하실 수 있으며, 이 경우 조사에 참여할 수 없습니다. 참여하지 않아도 어떤 불이익도 없습니다.",
  consentLabel:
    "조사 목적, 수집항목, 보유기간과 철회 방법을 확인했고 참여에 동의합니다.",
  ageLabel: "만 18세 이상입니다.",
} as const;

// ------------------------------------------------------------------ SF-01

export const ELIG_STATUS = [
  { value: "recent", label: "최근 12개월 내 일본 자유여행을 다녀왔다" },
  { value: "planning", label: "3개월 내 일본 자유여행을 준비 중이다" },
  { value: "both", label: "둘 다 해당한다" },
  { value: "none", label: "해당 없음" },
] as const;

export const ELIG_SCOPE = [
  { value: "places", label: "방문 장소" },
  { value: "food", label: "음식점·카페" },
  { value: "stay", label: "숙소" },
  { value: "transit", label: "교통·이동" },
  { value: "itinerary", label: "일정" },
  { value: "booking", label: "예약" },
  { value: "none", label: "직접 정한 것이 거의 없음" },
] as const;

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

/** "특별히 달라진 것은 없었다"와 동시 선택 불가 (contract SF-04 Validation) */
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
  headline: "여행 조건에 맞춘 정보를 한 장으로 확인한다면",
  body: "현재 정식 서비스 출시 전 단계에서, 일부 여행 예정자의 실제 조건을 바탕으로 정보 샘플을 수동으로 제작하고 있습니다.",
  includes: [
    `조건에 맞는 장소 약 ${SAMPLE_PLACE_COUNT}곳`,
    "각 장소를 고른 이유",
    "확인한 영업·휴무·예약 유의사항",
    "대중교통 접근과 방문 시기 주의점",
    "마지막 확인일",
    "공식·현지 원문 출처 링크",
  ],
  boundary:
    "무료 샘플이며 예약 대행, 전체 일정 제작, 실시간 영업 보장과 현장 대응은 포함하지 않습니다. 신청 내용을 보고 실제 제작이 가능한 일부 요청자에게만 연락드립니다.",
  cta: "내 여행 조건으로 샘플 요청하기",
  secondary: "요청하지 않고 조사 마치기",
  noUpcomingTrip:
    "현재 구체적인 일본 여행계획이 있는 분을 대상으로 샘플을 제작하고 있습니다. 응답은 문제조사 자료로 저장됐으며 여기서 마칠 수 있습니다.",
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
  followupConsent:
    "샘플을 받은 뒤 실제 사용 여부를 묻는 짧은 후속 연락에 동의합니다.",
  retentionNote: `이메일은 샘플 제공과 후속 확인에만 사용하며 수집일로부터 ${RETENTION_MONTHS}개월 후 파기합니다. 광고 발송이나 외부 제공은 하지 않습니다.`,
  submit: "정보 샘플 요청 제출하기",
} as const;

// ------------------------------------------------------------------ 종료 화면

export const EXIT = {
  ineligible:
    "참여해주셔서 감사합니다. 이번 조사는 최근 일본 자유여행을 직접 준비했거나 현재 구체적으로 준비 중인 분을 대상으로 하고 있어 여기서 종료됩니다.",
  surveyOnly:
    "여행 준비 경험을 남겨주셔서 감사합니다. 응답은 일본 자유여행 정보탐색 과정을 분석하는 데 사용됩니다.",
  requested: [
    "요청이 접수됐습니다.",
    "현재 수동으로 샘플을 제작하고 있어 모든 요청에 제공하지 못할 수 있습니다. 제작 대상으로 선정되면 입력한 이메일로 안내드리겠습니다.",
  ],
} as const;

// ------------------------------------------------------------------ helpers

export type Option = { value: string; label: string };

export function labelOf(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
