"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteTravelPost, type DeleteState } from "@/app/posts/actions";

const initialState: DeleteState = { status: "idle" };

export function DeletePostDialog({ id, title }: { id: string; title: string }) {
  const [state, action] = useActionState(deleteTravelPost, initialState);
  const dialogId = `delete-${id}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={dialogId}
        className="flex h-12 items-center justify-center rounded-2xl border border-line px-4 text-sm font-semibold text-danger"
      >
        삭제
      </button>
      <div
        id={dialogId}
        popover="auto"
        className="w-[min(24rem,calc(100%-3rem))] rounded-2xl border border-line bg-page p-6"
      >
        <h2 className="text-lg font-semibold">이 글을 삭제할까요?</h2>
        <p className="mt-2 text-sm text-body">
          “{title}” 글과 연결된 이미지를 삭제합니다. 삭제한 뒤에는 되돌릴 수 없습니다.
        </p>
        {state.message ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        <form action={action} className="mt-6 grid gap-2">
          <input type="hidden" name="id" value={id} />
          <ConfirmDelete />
          <button
            type="button"
            popoverTarget={dialogId}
            popoverTargetAction="hide"
            className="h-12 rounded-2xl border border-line text-sm font-semibold text-body"
          >
            취소
          </button>
        </form>
      </div>
    </>
  );
}

function ConfirmDelete() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-2xl bg-danger text-sm font-semibold text-accent-ink disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
