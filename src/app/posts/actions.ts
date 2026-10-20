"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  fieldErrors,
  imageBytesError,
  optionalImage,
  travelPostSchema,
  type ImageMime,
  type PostDraft,
  type PostFieldErrors,
} from "@/lib/travel-post-contract";
import {
  createTravelPostRow,
  deleteTravelPostRow,
  updateTravelPostRow,
} from "@/lib/travel-posts";

export type PostFormState = {
  status: "idle" | "error";
  message?: string;
  fields?: PostFieldErrors;
  values?: PostDraft;
};

export type DeleteState = {
  status: "idle" | "error";
  message?: string;
};

function draftOf(formData: FormData): PostDraft {
  return {
    title: String(formData.get("title") ?? ""),
    region: String(formData.get("region") ?? ""),
    body: String(formData.get("body") ?? ""),
  };
}

function fail(
  values: PostDraft,
  fields?: PostFieldErrors,
  message?: string,
): PostFormState {
  return { status: "error", fields, message, values };
}

export async function saveTravelPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const values = draftOf(formData);
  const parsed = travelPostSchema.safeParse(values);
  if (!parsed.success) {
    return fail(values, fieldErrors(parsed.error));
  }

  const file = optionalImage(formData);
  let image: { type: ImageMime; bytes: Uint8Array } | null = null;
  if (file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const message = imageBytesError(file.type, bytes);
    if (message) return fail(values, { image: message });
    image = { type: file.type as ImageMime, bytes };
  }

  const id = String(formData.get("id") ?? "");
  const input = {
    title: parsed.data.title,
    region: parsed.data.region,
    body: parsed.data.body,
    image,
  };

  let destination = "";
  try {
    if (id) {
      const result = await updateTravelPostRow({
        ...input,
        id,
        removeImage: formData.get("remove_image") === "on",
      });
      if (result === "missing") {
        return fail(values, undefined, "이미 삭제되었거나 없는 글입니다.");
      }
      destination = `/posts/${id}`;
    } else {
      destination = `/posts/${await createTravelPostRow(input)}`;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "저장하지 못했습니다. 다시 시도해주세요.";
    return fail(values, undefined, message);
  }

  revalidatePath("/posts");
  revalidatePath(destination);
  redirect(destination);
}

export async function deleteTravelPost(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const id = String(formData.get("id") ?? "");
  try {
    const removed = await deleteTravelPostRow(id);
    if (!removed) {
      return { status: "error", message: "이미 삭제되었거나 없는 글입니다." };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "삭제하지 못했습니다. 다시 시도해주세요.",
    };
  }
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect("/posts");
}
