import type { Metadata } from "next";
import Link from "next/link";
import { DeletePostDialog } from "@/components/posts/DeletePostDialog";
import { MissingPost } from "@/components/posts/MissingPost";
import {
  excerpt,
  formatWhen,
  regionLabel,
} from "@/lib/travel-post-contract";
import { getTravelPost } from "@/lib/travel-posts";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getTravelPost(id).catch(() => null);
  if (!post) return { title: "글을 찾을 수 없습니다" };
  const description = excerpt(post.body, 120);
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: post.image_url ? [{ url: post.image_url }] : undefined,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const post = await getTravelPost(id);
  if (!post) return <MissingPost />;

  const edited =
    new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000;

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto w-full max-w-[42rem]">
        <Link href="/posts" className="text-sm font-semibold text-accent">
          목록으로
        </Link>
        <p className="mt-4 text-sm font-semibold text-weak-ink">
          {regionLabel(post.region)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-9 tracking-[-0.01em]">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          등록 {formatWhen(post.created_at)}
          {edited ? ` · 수정 ${formatWhen(post.updated_at)}` : null}
        </p>

        {post.image_url ? (
          <img
            src={post.image_url}
            alt={`${post.title} 이미지`}
            className="mt-6 aspect-[4/3] w-full rounded-2xl border border-line object-cover"
          />
        ) : (
          <div className="mt-6 rounded-2xl bg-surface px-5 py-10 text-center text-sm text-muted">
            {post.image_path
              ? "이미지를 불러오지 못했습니다. 잠시 후 다시 열어주세요."
              : "등록된 이미지가 없습니다."}
          </div>
        )}

        <p className="mt-6 whitespace-pre-wrap text-body">{post.body}</p>

        <div className="mt-8 flex gap-2">
          <Link
            href={`/posts/${post.id}/edit`}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-ink"
          >
            수정
          </Link>
          <DeletePostDialog id={post.id} title={post.title} />
        </div>
      </div>
    </main>
  );
}
