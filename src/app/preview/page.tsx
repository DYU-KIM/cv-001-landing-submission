import Link from "next/link";

/** 시안 비교용 목록. 방향을 정하면 이 폴더는 지운다. */
const OPTIONS = [
  {
    href: "/preview/bento",
    n: "①",
    title: "벤토 그리드형",
    desc: "주제 하나가 카드 하나. 경계가 카드 테두리로 보입니다.",
    tradeoff: "2026년 주류라 안전하지만 개성은 가장 약합니다.",
  },
  {
    href: "/preview/editorial",
    n: "②",
    title: "에디토리얼 문서형",
    desc: "번호와 가로줄로 구획을 나눕니다. 여백이 넓고 글이 큽니다.",
    tradeoff: "조사라는 성격에 가장 맞지만 심심해 보일 수 있습니다.",
  },
  {
    href: "/preview/brutal",
    n: "③",
    title: "라이트 브루탈리즘",
    desc: "2px 검은 테두리와 검은 머리띠. 경계가 가장 분명합니다.",
    tradeoff: "커뮤니티에서 눈에 띄지만 가벼워 보일 위험이 있습니다.",
  },
];

export default function PreviewIndex() {
  return (
    <main className="mx-auto w-full max-w-[46rem] flex-1 px-5 py-14">
      <h1 className="mb-2 text-2xl font-bold">랜딩페이지 시안 3종</h1>
      <p className="mb-10 text-muted">
        문구와 정보는 셋 다 같습니다. 구획을 만드는 방식만 다릅니다.
      </p>

      <div className="grid gap-3">
        {OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="block rounded-2xl border border-line p-6 transition hover:border-accent"
          >
            <p className="mb-1 text-sm font-semibold text-accent">{option.n}</p>
            <h2 className="mb-2 text-lg font-bold">{option.title}</h2>
            <p className="mb-1 text-[0.95rem]">{option.desc}</p>
            <p className="text-sm text-muted">{option.tradeoff}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        현재 페이지는{" "}
        <Link href="/" className="underline underline-offset-4">
          여기
        </Link>
        에서 볼 수 있습니다.
      </p>
    </main>
  );
}
