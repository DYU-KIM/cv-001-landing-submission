export function PostsLoading() {
  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto w-full max-w-[42rem]">
        <p className="text-sm font-semibold text-muted">여행 정보를 불러오는 중…</p>
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    </main>
  );
}
