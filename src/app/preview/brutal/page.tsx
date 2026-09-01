import HeroStart from "@/components/HeroStart";
import { CONTACT_EMAIL, LANDING } from "@/lib/contract";

/**
 * 방향 ③ 라이트 브루탈리즘.
 *
 * 구획을 2px 검은 테두리와 검은 머리띠로 만든다.
 * 어디까지가 한 구역인지 선으로 못 박는 방식이라 경계가 가장 분명하다.
 */
export default function BrutalPreview() {
  return (
    <main className="flex-1 bg-[#f4f4f0]">
      {/* 히어로 */}
      <section className="border-b-2 border-ink bg-white">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-12 sm:py-16">
          <p className="mb-6 inline-block border-2 border-ink bg-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-accent-ink">
            {LANDING.eyebrow}
          </p>
          <h1 className="mb-6 max-w-[18ch] whitespace-pre-line text-[2.3rem] font-extrabold leading-[1.14] tracking-[-0.03em] sm:text-[3.2rem]">
            {LANDING.headline}
          </h1>
          <p className="mb-8 max-w-[32rem] text-lg leading-relaxed">
            {LANDING.subhead}
          </p>

          <div className="mb-10 max-w-[32rem] border-2 border-ink bg-accent p-5 text-accent-ink shadow-[6px_6px_0_0_var(--color-ink)]">
            <p className="text-[1.1rem] font-semibold leading-relaxed">
              {LANDING.rewardLine.strong}
              {LANDING.rewardLine.tail}
            </p>
            <p className="mt-2 text-sm opacity-90">{LANDING.rewardLine.note}</p>
          </div>

          <div className="max-w-[30rem]">
            <HeroStart variant="brutal" />
          </div>
        </div>
      </section>

      <Block label={LANDING.reward.title}>
        <p className="mb-6 max-w-[24ch] text-2xl font-extrabold leading-snug">
          {LANDING.reward.lead}
        </p>
        <ul className="grid max-w-[32rem] gap-0 border-2 border-ink bg-white">
          {LANDING.reward.lines.map((line) => (
            <li
              key={line}
              className="border-b-2 border-ink px-4 py-3.5 text-[1.02rem] last:border-b-0"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-xs">{LANDING.reward.note}</p>
      </Block>

      <Block label="진행 방식">
        <ol className="grid gap-3 sm:grid-cols-3">
          {LANDING.steps.map((step, i) => (
            <li
              key={step.title}
              className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0_0_var(--color-ink)]"
            >
              <span className="mb-3 inline-block border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold">
                STEP {i + 1}
              </span>
              <b className="mb-1 block text-[1.05rem] font-bold">{step.title}</b>
              <span className="text-sm">{step.desc}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-[32rem] border-2 border-ink bg-white px-4 py-3 text-[0.95rem]">
          {LANDING.timeline}
        </p>
      </Block>

      <Block label="여쭤볼 것">
        <ul className="grid max-w-[32rem] gap-3">
          {LANDING.asks.map((line, i) => (
            <li
              key={line}
              className="flex gap-4 border-2 border-ink bg-white px-4 py-3.5"
            >
              <span className="font-mono text-sm font-bold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[1.02rem]">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-xs">정답이 없는 질문입니다.</p>
      </Block>

      <Block label="개인정보">
        <ul className="grid max-w-[36rem] gap-3 sm:grid-cols-2">
          {LANDING.trust.map((line) => (
            <li
              key={line}
              className="border-2 border-ink bg-white px-4 py-3 text-[0.98rem]"
            >
              {line}
            </li>
          ))}
        </ul>
      </Block>

      <Block label="이 조사를 하는 사람">
        <p className="max-w-[32rem] border-2 border-ink bg-white p-5 text-[1.02rem] leading-relaxed shadow-[4px_4px_0_0_var(--color-ink)]">
          {LANDING.founderNote}
        </p>
        <div className="mt-6 grid max-w-[32rem] gap-3">
          {LANDING.faq.map((item) => (
            <details
              key={item.q}
              className="group border-2 border-ink bg-white px-4 py-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {item.q}
                <span
                  aria-hidden
                  className="font-mono transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[0.95rem]">{item.a}</p>
            </details>
          ))}
        </div>
      </Block>

      {/* 마지막 */}
      <section className="border-t-2 border-ink bg-white">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-12 sm:py-16">
          <h2 className="mb-8 max-w-[20ch] text-[1.8rem] font-extrabold leading-snug">
            {LANDING.finalCta}
          </h2>
          <div className="max-w-[30rem]">
            <HeroStart variant="brutal" trackView={false} />
          </div>
          <p className="mt-8 max-w-[32rem] font-mono text-xs leading-relaxed">
            {LANDING.qualification}
          </p>
        </div>
      </section>

      <footer className="border-t-2 border-ink bg-ink text-[#f4f4f0]">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-8 font-mono text-xs leading-relaxed">
          {LANDING.notice.map((line) => (
            <p key={line}>· {line}</p>
          ))}
          <p className="mt-3">문의·삭제 요청: {CONTACT_EMAIL}</p>
        </div>
      </footer>
    </main>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-ink">
      <div className="border-b-2 border-ink bg-ink">
        <div className="mx-auto w-full max-w-[46rem] px-5 py-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#f4f4f0]">
            {label}
          </span>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[46rem] px-5 py-10 sm:py-14">
        {children}
      </div>
    </section>
  );
}
