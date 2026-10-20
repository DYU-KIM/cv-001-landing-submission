import Link from "next/link";
import {
  excerpt,
  formatWhen,
  regionLabel,
  type TravelPost,
} from "@/lib/travel-post-contract";

export function PostCard({ post }: { post: TravelPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex gap-4 rounded-2xl border border-line bg-page p-4"
    >
      {post.image_url ? (
        <img
          src={post.image_url}
          alt=""
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface text-center text-xs text-muted">
          이미지 없음
        </span>
      )}
      <span className="min-w-0">
        <span className="text-sm font-semibold text-weak-ink">
          {regionLabel(post.region)}
        </span>
        <span className="mt-1 block truncate font-semibold">{post.title}</span>
        <span className="mt-1 block text-sm text-body line-clamp-2">
          {excerpt(post.body)}
        </span>
        <span className="mt-2 block text-xs text-muted">
          {formatWhen(post.created_at)}
        </span>
      </span>
    </Link>
  );
}
