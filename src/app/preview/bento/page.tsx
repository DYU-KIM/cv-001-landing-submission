import HeroStart from "@/components/HeroStart";
import { CONTACT_EMAIL, LANDING } from "@/lib/contract";

/**
 * 방향 ① 벤토 그리드형.
 *
 * 구획을 카드 경계로 만든다. 카드 하나 = 주제 하나이고,
 * 카드마다 이름표(eyebrow) → 제목 → 내용의 같은 순서를 지킨다.
 */
export default function BentoPreview() {
  return (
    <main className="flex-1">
      {/* 1. 히어로 */}
      <section className="border-b border-line bg-[linear-gradient(180deg,#eef3ff_0%,#f7f9fc_60%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:py-20">
          <Eyebrow>{LANDING.eyebrow}</Eyebrow>
          <h1 className="mb-5 max-w-[20ch] whitespace-pre-line text-[2.05rem] font-bold leading-[1.26] tracking-[-0.02em] sm:text-[2.75rem]">
            {LANDING.headline}
          </h1>
          <p className="mb-7 max-w-[32rem] text-lg leading-relaxed text-muted">
            {LANDING.subhead}
          </p>

          <div className="mb-9 max-w-[32rem] rounded-2xl border border-accent/30 bg-white p-5">
            <p className="text-[1.05rem] leading-relaxed">
              <b className="font-semibold text-accent">
                {LANDING.rewardLine.strong}
              </b>
              {LANDING.rewardLine.tail}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {LANDING.rewardLine.note}
            </p>
          </div>

          <div className="max-w-[30rem]">
            <HeroStart />
          </div>
        </div>
      </section>

      {/* 2. 벤토 그리드 */}
      <section className="bg-soft">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card span>
              <Eyebrow>{LANDING.reward.title}</Eyebrow>
              <h2 className="mb-5 text-2xl font-bold leading-snug tracking-[-0.01em]">
                {LANDING.reward.lead}
              </h2>
              <ul className="grid gap-2.5">
                {LANDING.reward.lines.map((line) => (
                  <Bullet key={line}>{line}</Bullet>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
                {LANDING.reward.note}
              </p>
            </Card>

            <Card>
              <Eyebrow>진행 방식</Eyebrow>
              <h2 className="mb-5 text-xl font-bold">어떻게 진행되나요</h2>
              <ol className="grid gap-4">
                {LANDING.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
                      {i + 1}
                    </span>
                    <span>
                      <b className="block font-semibold">{step.title}</b>
                      <span className="text-sm text-muted">{step.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <Eyebrow>질문</Eyebrow>
              <h2 className="mb-5 text-xl font-bold">이런 것을 여쭤봅니다</h2>
              <ul className="grid gap-3">
                {LANDING.asks.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[0.95rem]">
                    <span
                      aria-hidden
                      className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-muted"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted">
                정답이 없는 질문입니다.
              </p>
            </Card>

            <Card span accent>
              <Eyebrow accent>개인정보</Eyebrow>
              <h2 className="mb-5 text-xl font-bold">이렇게 다룹니다</h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {LANDING.trust.map((line) => (
                  <Bullet key={line}>{line}</Bullet>
                ))}
              </ul>
            </Card>

            <Card>
              <Eyebrow>연락 시점</Eyebrow>
              <p className="text-[0.95rem] leading-relaxed">
                {LANDING.timeline}
              </p>
            </Card>

            <Card>
              <Eyebrow>만드는 사람</Eyebrow>
              <p className="text-[0.95rem] leading-relaxed">
                {LANDING.founderNote}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. 자주 묻는 것 */}
      <section className="border-y border-line">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:py-20">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mb-6 text-2xl font-bold">자주 묻는 것</h2>
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
                <p className="mt-3 max-w-[34rem] text-[0.95rem] text-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 마지막 */}
      <section>
        <div className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:py-20">
          <h2 className="mb-6 max-w-[24ch] text-2xl font-bold leading-snug">
            {LANDING.finalCta}
          </h2>
          <div className="max-w-[30rem]">
            <HeroStart trackView={false} />
          </div>
          <p className="mt-8 max-w-[34rem] text-sm text-muted">
            {LANDING.qualification}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Card({
  children,
  span,
  accent,
}: {
  children: React.ReactNode;
  span?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 sm:p-7 ${span ? "sm:col-span-2" : ""} ${
        accent ? "border-accent/25 bg-[#f2f6ff]" : "border-line bg-white"
      }`}
    >
      {children}
    </div>
  );
}

function Eyebrow({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <p
      className={`mb-2 text-xs font-semibold uppercase tracking-[0.12em] ${
        accent ? "text-accent" : "text-muted"
      }`}
    >
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[0.95rem]">
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
      <span>{children}</span>
    </li>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-soft">
      <div className="mx-auto w-full max-w-[46rem] px-5 py-8 text-xs leading-relaxed text-muted">
        {LANDING.notice.map((line) => (
          <p key={line}>· {line}</p>
        ))}
        <p className="mt-3">문의·삭제 요청: {CONTACT_EMAIL}</p>
      </div>
    </footer>
  );
}
