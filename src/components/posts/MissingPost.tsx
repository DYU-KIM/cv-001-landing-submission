import Link from "next/link";

export function MissingPost() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-[42rem] text-center">
        <h1 className="text-2xl font-semibold">글을 찾을 수 없습니다</h1>
        <p className="mt-3 text-body">
          주소가 잘못되었거나 이미 삭제된 여행 정보입니다.
        </p>
        <Link
          href="/posts"
          className="mt-6 inline-flex h-12 items-center rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink"
        >
          목록으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
