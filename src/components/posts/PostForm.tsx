"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveTravelPost, type PostFormState } from "@/app/posts/actions";
import { Field } from "@/components/fields";
import {
  BODY_MAX,
  TITLE_MAX,
  TRAVEL_REGIONS,
  imageError,
  type PostDraft,
} from "@/lib/travel-post-contract";
import { graphemeLength } from "@/lib/validation";

const initialState: PostFormState = { status: "idle" };

const inputClass =
  "w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-accent";

export function PostForm({
  postId,
  initial,
  existingImageUrl,
  hasImage = false,
}: {
  postId?: string;
  initial?: PostDraft;
  existingImageUrl?: string | null;
  hasImage?: boolean;
}) {
  const [state, action] = useActionState(saveTravelPost, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.values) return;
    setTitle(state.values.title);
    setRegion(state.values.region);
    setBody(state.values.body);
  }, [state]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const imageErrorMessage = fileMessage ?? state.fields?.image;
  const showExisting = Boolean(existingImageUrl) && !preview && !removeImage;

  return (
    <form action={action} className="grid gap-2" noValidate>
      {postId ? <input type="hidden" name="id" value={postId} /> : null}
      {state.message ? (
        <p role="alert" className="mb-4 rounded-2xl bg-surface px-5 py-4 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <Field label="제목" error={state.fields?.title}>
        <input
          name="title"
          value={title}
          placeholder="예: 오사카 2일차, 오전은 성 주변만"
          className={inputClass}
          aria-invalid={Boolean(state.fields?.title)}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Count value={title} max={TITLE_MAX} />
      </Field>

      <Field label="지역" error={state.fields?.region}>
        <select
          name="region"
          value={region}
          className={`${inputClass} h-14`}
          aria-invalid={Boolean(state.fields?.region)}
          onChange={(event) => setRegion(event.target.value)}
        >
          <option value="">지역을 선택해주세요</option>
          {TRAVEL_REGIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="내용"
        hint="준비하면서 알아둔 동선, 교통, 운영시간을 적습니다. 이메일과 전화번호는 넣지 않습니다."
        error={state.fields?.body}
      >
        <textarea
          name="body"
          value={body}
          rows={8}
          placeholder="어느 지역에서, 어떤 정보를 어떻게 확인했는지 적어주세요."
          className={inputClass}
          aria-invalid={Boolean(state.fields?.body)}
          onChange={(event) => setBody(event.target.value)}
        />
        <Count value={body} max={BODY_MAX} />
      </Field>

      <Field
        label="이미지"
        optional
        hint="JPG, PNG, WEBP · 5MB 이하. 없어도 등록할 수 있습니다."
        error={imageErrorMessage ?? undefined}
      >
        {showExisting && existingImageUrl ? (
          <img
            src={existingImageUrl}
            alt="현재 등록된 이미지"
            className="mb-3 aspect-[4/3] w-full rounded-2xl border border-line object-cover"
          />
        ) : null}
        {hasImage && !existingImageUrl && !preview ? (
          <p className="mb-3 rounded-2xl bg-surface px-5 py-4 text-sm text-muted">
            등록된 이미지를 지금 불러오지 못했습니다. 새 이미지를 올리거나 삭제할 수 있습니다.
          </p>
        ) : null}
        {preview ? (
          <img
            src={preview}
            alt="올리기 전 미리보기"
            className="mb-3 aspect-[4/3] w-full rounded-2xl border border-line object-cover"
          />
        ) : null}
        <input
          ref={fileRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-body file:mr-3 file:rounded-xl file:border-0 file:bg-weak file:px-4 file:py-2 file:font-semibold file:text-weak-ink"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (preview) URL.revokeObjectURL(preview);
            if (!file) {
              setPreview(null);
              setFileMessage(null);
              return;
            }
            void imageError(file).then((message) => {
              if (message) {
                event.target.value = "";
                setPreview(null);
                setFileMessage(message);
                return;
              }
              setFileMessage(null);
              setRemoveImage(false);
              setPreview(URL.createObjectURL(file));
            });
          }}
        />
        {hasImage ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              name="remove_image"
              className="h-4 w-4 accent-accent"
              checked={removeImage}
              onChange={(event) => {
                setRemoveImage(event.target.checked);
                if (!event.target.checked) return;
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                setFileMessage(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            등록된 이미지 삭제
          </label>
        ) : null}
      </Field>

      <div className="mt-2 grid gap-2">
        <SubmitButton label={postId ? "수정 내용 저장" : "여행 정보 등록"} />
        <Link
          href={postId ? `/posts/${postId}` : "/posts"}
          className="flex h-14 items-center justify-center rounded-2xl border border-line text-[17px] font-semibold text-body"
        >
          취소
        </Link>
      </div>
    </form>
  );
}

function Count({ value, max }: { value: string; max: number }) {
  const used = graphemeLength(value);
  return (
    <p className={`mt-1 text-right text-sm ${used > max ? "text-danger" : "text-muted"}`}>
      {used} / {max}
    </p>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="h-14 w-full rounded-2xl bg-accent px-5 text-[17px] font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? "저장 중…" : label}
    </button>
  );
}
