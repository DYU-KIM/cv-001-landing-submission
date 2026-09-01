import LandingCta from "@/components/LandingCta";
import { CONTACT_EMAIL, LANDING } from "@/lib/contract";

/**
 * LP-01 랜딩페이지.
 *
 * 참여 동기(무료 정보 샘플)와 신뢰 요소는 앞세우되,
 * 문제를 단정하거나 정답 후보를 제시하지 않는다.
 * 샘플의 전체 구성은 설문을 마친 뒤 SO-01에서만 공개한다.
 */
export default function LandingPage() {
  return (
    <>
      <main className="flex-1 pb-28 sm:pb-10">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-20%,#e8efff_0%,#f7f9fc_45%,#ffffff_100%)]"
          />
          <RouteMotif />

          <div className="relative mx-auto w-full max-w-[46rem] px-5 pb-12 pt-14 sm:pt-20">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              {LANDING.eyebrow}
            </p>

            <h1 className="mb-5 whitespace-pre-line text-[2rem] font-bold leading-[1.28] tracking-[-0.02em] sm:text-[2.75rem]">
              {LANDING.headline}
            </h1>

            <p className="mb-9 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl">
              {LANDING.subhead}
            </p>

            <div className="max-w-[26rem]">
              <LandingCta trackView />
              <p className="mt-3 text-center text-sm text-muted">
                {LANDING.ctaNote}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[46rem] px-5">
          {/* 참여 대가 */}
          <section className="rounded-3xl border border-line bg-soft p-6 sm:p-8">
            <p className="mb-2 text-sm font-semibold text-accent">
              {LANDING.reward.title}
            </p>
            <p className="mb-5 text-xl font-semibold leading-snug sm:text-2xl">
              {LANDING.reward.lead}
            </p>
            <ul className="grid gap-2.5">
              {LANDING.reward.lines.map((line) => (
                <li key={line} className="flex gap-2.5 text-[0.975rem]">
                  <CheckIcon />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
              {LANDING.reward.note}
            </p>
          </section>

          {/* 진행 방식 */}
          <Section title="어떻게 진행되나요">
            <ol className="grid gap-3">
              {LANDING.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-line p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">
                    {i + 1}
                  </span>
                  <span>
                    <b className="block font-semibold">{step.title}</b>
                    <span className="text-sm text-muted">{step.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          {/* 무엇을 묻는지 */}
          <Section title="이런 것을 여쭤봅니다">
            <ul className="grid gap-2.5">
              {LANDING.asks.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              정답이 없는 질문입니다. 편하게 답해주시면 됩니다.
            </p>
          </Section>

          {/* 안심 요소 */}
          <Section title="개인정보는 이렇게 다룹니다">
            <ul className="grid gap-2.5">
              {LANDING.trust.map((line) => (
                <li key={line} className="flex gap-2.5 text-[0.975rem]">
                  <CheckIcon />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 만드는 사람 */}
          <section className="my-10 rounded-3xl border border-line p-6 sm:p-8">
            <p className="mb-3 text-sm font-semibold text-muted">
              이 조사를 하는 사람
            </p>
            <p className="text-[1.05rem] leading-relaxed">
              {LANDING.founderNote}
            </p>
          </section>

          {/* FAQ */}
          <Section title="자주 묻는 것">
            <div className="grid gap-3">
              {LANDING.faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-line px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-muted transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[0.975rem] text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          {/* 대상 안내 + 데스크톱 CTA */}
          <section className="mb-12 rounded-3xl bg-soft p-6 sm:p-8">
            <p className="mb-6 text-sm text-muted">{LANDING.qualification}</p>
            <div className="mx-auto max-w-[26rem]">
              <LandingCta />
              <p className="mt-3 text-center text-sm text-muted">
                {LANDING.ctaNote}
              </p>
            </div>
          </section>

          <footer className="border-t border-line py-8 text-xs leading-relaxed text-muted">
            {LANDING.notice.map((line) => (
              <p key={line}>· {line}</p>
            ))}
            <p className="mt-3">문의·삭제 요청: {CONTACT_EMAIL}</p>
          </footer>
        </div>
      </main>

      {/* 모바일 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <LandingCta compact />
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="my-10">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-1 h-4 w-4 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  );
}

/** 히어로 배경의 옅은 경로·지점 모티프. 장식일 뿐 정보를 주장하지 않는다. */
function RouteMotif() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 320"
      className="pointer-events-none absolute inset-x-0 top-0 h-[320px] w-full opacity-[0.28]"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4fd8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1f4fd8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-20 210 C 120 150, 200 250, 330 190 S 560 120, 700 170 830 150 830 150"
        fill="none"
        stroke="url(#fade)"
        strokeWidth="1.6"
        strokeDasharray="6 8"
      />
      <path
        d="M-20 120 C 140 60, 260 160, 400 110 S 640 40, 830 90"
        fill="none"
        stroke="url(#fade)"
        strokeWidth="1.2"
        strokeDasharray="4 10"
      />
      {[
        [140, 176],
        [330, 190],
        [520, 138],
        [700, 170],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}`}
          cx={cx}
          cy={cy}
          r="4"
          fill="#1f4fd8"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}
