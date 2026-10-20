import Link from "next/link";
import { Suspense } from "react";
import { Pagination } from "@/components/posts/Pagination";
import { PostCard } from "@/components/posts/PostCard";
import { PostFilters } from "@/components/posts/PostFilters";
import { PostsLoading } from "@/components/posts/PostsLoading";
import {
  PAGE_SIZE,
  TRAVEL_REGIONS,
  type PostSort,
  type TravelRegion,
} from "@/lib/travel-post-contract";
import { listTravelPosts, type PostListQuery } from "@/lib/travel-posts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "여행 정보",
  description: "일본 여행 준비 중 정리한 지역 정보를 등록하고 찾아봅니다.",
};

type Search = {
  page?: string;
  region?: string;
  q?: string;
  sort?: string;
};

export default function PostsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<PostsLoading />}>
      <PostList searchParams={searchParams} />
    </Suspense>
  );
}

async function PostList({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = parseQuery(await searchParams);
  const { posts, total } = await listTravelPosts(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preserved = preservedQuery(query);
  const filtered = Boolean(query.q || query.region);

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto w-full max-w-[42rem]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.01em]">여행 정보</h1>
            <p className="mt-1 text-sm text-muted">
              {total}개 · 로그인 없이 등록하고 수정할 수 있습니다
            </p>
          </div>
          <Link
            href="/posts/new"
            className="flex h-12 shrink-0 items-center rounded-2xl bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            글 등록
          </Link>
        </div>

        <PostFilters q={query.q} region={query.region} sort={query.sort} />

        {query.page > totalPages ? (
          <p className="rounded-2xl bg-surface px-5 py-8 text-center text-body">
            요청한 페이지가 없습니다.{" "}
            <Link href={listHref({ ...preserved, page: "1" })} className="font-semibold text-accent">
              첫 페이지로 이동
            </Link>
          </p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl bg-surface px-5 py-10 text-center">
            <p className="font-semibold">
              {filtered ? "조건에 맞는 글이 없습니다." : "아직 등록된 여행 정보가 없습니다."}
            </p>
            <p className="mt-2 text-sm text-muted">
              {filtered
                ? "검색어나 지역을 바꿔 다시 찾아보세요."
                : "동선, 교통, 운영시간처럼 준비하면서 확인한 내용을 남겨보세요."}
            </p>
            {filtered ? (
              <Link href="/posts" className="mt-4 inline-flex font-semibold text-accent">
                전체 목록 보기
              </Link>
            ) : (
              <Link href="/posts/new" className="mt-4 inline-flex font-semibold text-accent">
                첫 글 등록하기
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}

        {query.page <= totalPages ? (
          <Pagination page={query.page} totalPages={totalPages} query={preserved} />
        ) : null}
      </div>
    </main>
  );
}

function parseQuery(search: Search): PostListQuery {
  const pageNumber = Number(search.page);
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const region: TravelRegion | "" = isRegion(search.region) ? search.region : "";
  const q = (search.q ?? "").trim().slice(0, 80);
  const sort: PostSort = search.sort === "oldest" ? "oldest" : "latest";
  return { page, region, q, sort };
}

function isRegion(value: string | undefined): value is TravelRegion {
  return TRAVEL_REGIONS.some((region) => region.value === value);
}

function preservedQuery(query: {
  region: string;
  q: string;
  sort: PostSort;
}): Record<string, string> {
  const params: Record<string, string> = {};
  if (query.q) params.q = query.q;
  if (query.region) params.region = query.region;
  if (query.sort === "oldest") params.sort = query.sort;
  return params;
}

function listHref(query: Record<string, string>) {
  const params = new URLSearchParams(query);
  const text = params.toString();
  return text ? `/posts?${text}` : "/posts";
}
