import { TRAVEL_REGIONS } from "@/lib/travel-post-contract";

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-page px-4 outline-none focus:border-accent";

export function PostFilters({
  q,
  region,
  sort,
}: {
  q: string;
  region: string;
  sort: string;
}) {
  return (
    <form action="/posts" method="get" className="mb-6 grid gap-2 rounded-2xl bg-surface p-4">
      <label className="grid gap-1 text-sm font-semibold">
        검색
        <input
          name="q"
          defaultValue={q}
          placeholder="제목 또는 내용"
          className={inputClass}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          지역
          <select name="region" defaultValue={region} className={inputClass}>
            <option value="">전체</option>
            {TRAVEL_REGIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          정렬
          <select name="sort" defaultValue={sort} className={inputClass}>
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </label>
      </div>
      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="h-12 flex-1 rounded-2xl bg-accent text-sm font-semibold text-accent-ink"
        >
          적용
        </button>
        <a
          href="/posts"
          className="flex h-12 items-center justify-center rounded-2xl border border-line bg-page px-4 text-sm font-semibold"
        >
          초기화
        </a>
      </div>
    </form>
  );
}
