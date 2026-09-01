import HeroStart from "@/components/HeroStart";
import { CONTACT_EMAIL, LANDING } from "@/lib/contract";

/**
 * 방향 ② 에디토리얼 문서형.
 *
 * 구획을 카드가 아니라 번호·구분선·여백으로 만든다.
 * 큰 번호와 가로줄이 섹션의 시작을 알리고, 본문은 한 줄 길이를 좁게 유지한다.
 */
export default function EditorialPreview() {
  return (
    <main className="flex-1">
      {/* 히어로 */}
      <header className="mx-auto w-full max-w-[46rem] px-5 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {LANDING.eyebrow}
        </p>
        <h1 className="mb-8 max-w-[18ch] whitespace-pre-line text-[2.4rem] font-bold leading-[1.2] tracking-[-0.03em] sm:text-[3.4rem]">
          {LANDING.headline}
        </h1>
        <p className="mb-10 max-w-[30rem] border-l-2 border-ink pl-5 text-lg leading-relaxed">
          {LANDING.subhead}
          <br />
          <span className="text-muted">
            <b className="font-semibold text-ink">
              {LANDING.rewardLine.strong}
            </b>
            {LANDING.rewardLine.tail}
          </span>
        </p>

        <div className="max-w-[30rem]">
          <HeroStart variant="editorial" />
        </div>
      </header>

      <Section n="01" title={LANDING.reward.title}>
        <p className="mb-7 max-w-[26ch] text-[1.6rem] font-bold leading-snug tracking-[-0.01em]">
          {LANDING.reward.lead}
        </p>
        <ul className="grid max-w-[32rem] gap-0">
          {LANDING.reward.lines.map((line) => (
            <li
              key={line}
              className="border-t border-line py-3.5 text-[1.05rem] last:border-b"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[32rem] text-sm text-muted">
          {LANDING.reward.note}
        </p>
      </Section>

      <Section n="02" title="진행 방식">
        <ol className="grid max-w-[32rem] gap-0">
          {LANDING.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-5 border-t border-line py-5 last:border-b"
            >
              <span className="w-6 shrink-0 text-sm font-semibold text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <b className="block text-[1.05rem] font-semibold">
                  {step.title}
                </b>
                <span className="text-[0.95rem] text-muted">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[32rem] text-[0.95rem] text-muted">
          {LANDING.timeline}
        </p>
      </Section>

      <Section n="03" title="여쭤볼 것">
        <ul className="grid max-w-[32rem] gap-0">
          {LANDING.asks.map((line, i) => (
            <li
              key={line}
              className="flex gap-5 border-t border-line py-4 last:border-b"
            >
              <span className="w-6 shrink-0 text-sm font-semibold text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[1.05rem]">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          정답이 없는 질문입니다. 편하게 답해주시면 됩니다.
        </p>
      </Section>

      <Section n="04" title="개인정보">
        <ul className="grid max-w-[32rem] gap-3">
          {LANDING.trust.map((line) => (
            <li key={line} className="text-[1.05rem]">
              {line}
            </li>
          ))}
        </ul>
      </Section>

      <Section n="05" title="이 조사를 하는 사람">
        <p className="max-w-[32rem] text-[1.05rem] leading-relaxed">
          {LANDING.founderNote}
        </p>
        <div className="mt-8 grid max-w-[32rem] gap-0">
          {LANDING.faq.map((item) => (
            <details key={item.q} className="group border-t border-line py-4 last:border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span
                  aria-hidden
                  className="text-muted transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[0.95rem] text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 마지막 */}
      <section className="border-t-2 border-ink">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-16 sm:py-24">
          <h2 className="mb-8 max-w-[20ch] text-[1.9rem] font-bold leading-snug tracking-[-0.02em]">
            {LANDING.finalCta}
          </h2>
          <div className="max-w-[30rem]">
            <HeroStart variant="editorial" trackView={false} />
          </div>
          <p className="mt-10 max-w-[32rem] text-sm text-muted">
            {LANDING.qualification}
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-8 text-xs leading-relaxed text-muted">
          {LANDING.notice.map((line) => (
            <p key={line}>· {line}</p>
          ))}
          <p className="mt-3">문의·삭제 요청: {CONTACT_EMAIL}</p>
        </div>
      </footer>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:py-20">
        <div className="mb-8 flex items-baseline gap-4">
          <span className="text-sm font-semibold tabular-nums text-accent">
            {n}
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
