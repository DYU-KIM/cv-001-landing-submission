import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  query,
}: {
  page: number;
  totalPages: number;
  query: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function href(nextPage: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    return `/posts?${params.toString()}`;
  }

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="페이지" className="mt-6 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold">
          이전
        </Link>
      ) : (
        <span className="rounded-xl px-3 py-2 text-sm text-muted">이전</span>
      )}
      {pages.map((item) =>
        item === page ? (
          <span
            key={item}
            aria-current="page"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-ink"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-sm font-semibold"
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold">
          다음
        </Link>
      ) : (
        <span className="rounded-xl px-3 py-2 text-sm text-muted">다음</span>
      )}
    </nav>
  );
}

function pageWindow(page: number, total: number): number[] {
  const start = Math.max(1, page - 2);
  const end = Math.min(total, start + 4);
  const from = Math.max(1, end - 4);
  return Array.from({ length: end - from + 1 }, (_, index) => from + index);
}
