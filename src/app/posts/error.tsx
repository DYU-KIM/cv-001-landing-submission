"use client";

export default function PostsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-[42rem] text-center">
        <h1 className="text-2xl font-semibold">여행 정보를 불러오지 못했습니다</h1>
        <p className="mt-3 text-body">
          연결이 불안정하거나 저장소가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-12 items-center rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
