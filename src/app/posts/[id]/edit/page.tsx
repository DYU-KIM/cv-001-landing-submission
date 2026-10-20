import { MissingPost } from "@/components/posts/MissingPost";
import { PostForm } from "@/components/posts/PostForm";
import { getTravelPost } from "@/lib/travel-posts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "여행 정보 수정",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getTravelPost(id);
  if (!post) return <MissingPost />;

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto w-full max-w-[42rem]">
        <h1 className="mb-2 text-2xl font-semibold tracking-[-0.01em]">여행 정보 수정</h1>
        <p className="mb-6 text-sm text-muted">
          저장하면 상세 화면으로 돌아갑니다.
        </p>
        <PostForm
          postId={post.id}
          existingImageUrl={post.image_url}
          hasImage={Boolean(post.image_path)}
          initial={{ title: post.title, region: post.region, body: post.body }}
        />
      </div>
    </main>
  );
}
