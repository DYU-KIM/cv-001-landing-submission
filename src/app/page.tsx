import LandingCta from "@/components/LandingCta";
import { CONTACT_EMAIL, LANDING } from "@/lib/contract";

/**
 * LP-01 중립 랜딩페이지.
 *
 * 이 화면은 문제를 정의하거나 정답 후보를 제시하지 않는다.
 * 무엇을 조사하는지, 얼마나 걸리는지, 샘플 요청이 조사 뒤에만 가능하다는 점만 말한다.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col px-5 py-14 sm:py-20">
      <p className="mb-3 text-sm font-medium text-accent">{LANDING.eyebrow}</p>
      <h1 className="mb-6 text-3xl font-bold leading-snug sm:text-4xl">
        {LANDING.headline}
      </h1>

      {LANDING.body.map((line) => (
        <p key={line} className="mb-4 text-lg text-muted">
          {line}
        </p>
      ))}

      <div className="my-8 rounded-xl bg-soft p-5">
        <p className="text-sm text-muted">{LANDING.qualification}</p>
      </div>

      <LandingCta />

      <ul className="mt-6 grid gap-1 text-sm text-muted">
        {LANDING.notice.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>

      <footer className="mt-auto pt-14 text-xs text-muted">
        문의·삭제 요청: {CONTACT_EMAIL}
      </footer>
    </main>
  );
}
