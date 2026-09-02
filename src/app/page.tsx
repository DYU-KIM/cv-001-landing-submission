import StartCta from "@/components/StartCta";
import { INQUIRY, LANDING } from "@/lib/contract";

/**
 * LP-01 랜딩페이지.
 *
 * 구획은 흰색과 #f2f4f6 밴딩, 1px 경계선으로만 나눈다. 그림자는 쓰지 않는다.
 *
 * 한 사실은 한 번만 말한다. 추첨은 히어로에서, 무료인 이유는 두 번째 밴드에서,
 * 절차는 세 번째 밴드에서만 다룬다. 같은 말을 반복하는 FAQ·소개 문단은 두지 않는다.
 *
 * 이 화면은 문제를 단정하거나 정답 후보를 제시하지 않는다.
 * 여행 시점 자격조건(최근 12개월·3개월 내 예정)을 노출하지 않는다. (Q-058)
 * 나이 관련 문구도 두지 않는다. (Q-059)
 * 샘플의 고정 수량·구성은 약속하지 않는다. (Q-055)
 */
export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* 히어로 — 무엇을 묻나 / 무엇을 받나 / 시작 */}
      <section className="px-6 pb-10 pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-[42rem]">
          <p className="mb-4 inline-block rounded-md bg-weak px-2.5 py-1.5 text-sm font-semibold text-weak-ink">
            {LANDING.eyebrow}
          </p>

          <h1 className="mb-4 whitespace-pre-line text-[2.25rem] font-bold leading-[1.36] tracking-[-0.02em] sm:text-[2.75rem]">
            {LANDING.headline}
          </h1>

          <p className="mb-6 max-w-[34rem] text-body">{LANDING.subhead}</p>

          <p className="mb-8 max-w-[34rem] rounded-2xl bg-weak p-5 text-weak-ink">
            {LANDING.offer}
          </p>

          <StartCta trackView />
        </div>
      </section>

      {/* 왜 무료인가 */}
      <Band label={LANDING.reward.title} surface>
        <h2 className="mb-6 text-2xl font-semibold leading-9 tracking-[-0.01em]">
          {LANDING.reward.lead}
        </h2>
        <ul className="grid gap-4">
          {LANDING.reward.lines.map((line) => (
            <li key={line} className="flex gap-2">
              <Check />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Band>

      {/* 진행 방식 */}
      <Band label="진행 방식">
        <h2 className="mb-6 text-2xl font-semibold leading-9 tracking-[-0.01em]">
          어떻게 진행되나요
        </h2>
        <ol className="grid gap-2">
          {LANDING.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl bg-surface p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-weak text-sm font-semibold text-weak-ink">
                {i + 1}
              </span>
              <span>
                <b className="block font-semibold">{step.title}</b>
                <span className="text-sm text-muted">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </Band>

      {/* 무엇을 묻나 */}
      <Band label="질문" surface>
        <h2 className="mb-6 text-2xl font-semibold leading-9 tracking-[-0.01em]">
          이런 것을 여쭤봅니다
        </h2>
        <ul className="grid gap-4">
          {LANDING.asks.map((line, i) => (
            <li key={line} className="flex gap-4">
              <span className="shrink-0 text-sm font-semibold text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">{LANDING.asksNote}</p>
      </Band>

      {/* 마지막 */}
      <section className="border-t border-line px-6 py-10">
        <div className="mx-auto w-full max-w-[42rem]">
          <h2 className="mb-6 text-2xl font-semibold leading-9 tracking-[-0.01em]">
            {LANDING.finalCta}
          </h2>
          <StartCta />
        </div>
      </section>

      <footer className="bg-surface px-6 py-8">
        <div className="mx-auto w-full max-w-[42rem] text-sm text-muted">
          {LANDING.footerNotes.map((line) => (
            <p key={line} className="mb-1">
              · {line}
            </p>
          ))}
          <p className="mt-4">{INQUIRY.lead}</p>
          <p className="mt-1">이메일: {INQUIRY.email}</p>
        </div>
      </footer>
    </main>
  );
}

function Band({
  label,
  surface,
  children,
}: {
  label: string;
  surface?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`px-6 py-10 ${surface ? "bg-surface" : "border-t border-line"}`}
    >
      <div className="mx-auto w-full max-w-[42rem]">
        <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
        {children}
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-1 h-5 w-5 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  );
}
