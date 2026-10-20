import { PostForm } from "@/components/posts/PostForm";

export const metadata = {
  title: "여행 정보 등록",
  description: "일본 여행 준비 정보를 등록합니다.",
};

export default function NewPostPage() {
  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto w-full max-w-[42rem]">
        <h1 className="mb-2 text-2xl font-semibold tracking-[-0.01em]">여행 정보 등록</h1>
        <p className="mb-6 text-sm text-muted">
          제목, 지역, 내용은 필수입니다. 이미지는 선택입니다.
        </p>
        <PostForm />
      </div>
    </main>
  );
}
