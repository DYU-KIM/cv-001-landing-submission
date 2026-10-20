/**
 * 여행 정보 글의 입력 계약.
 * 화면과 서버 액션이 같은 규칙으로 검사한다. 저장 여부는 서버 결과가 결정한다.
 *
 * 이 글은 로그인 없이 공개된다. 이메일·전화번호는 받지 않는다.
 */

import { z } from "zod";
import { graphemeLength } from "./validation";

export const TRAVEL_REGIONS = [
  { value: "tokyo", label: "도쿄" },
  { value: "osaka", label: "오사카" },
  { value: "kyoto", label: "교토" },
  { value: "fukuoka", label: "후쿠오카" },
  { value: "sapporo", label: "삿포로" },
  { value: "okinawa", label: "오키나와" },
  { value: "nagoya", label: "나고야" },
  { value: "other", label: "기타" },
] as const;

export const REGION_VALUES = TRAVEL_REGIONS.map((region) => region.value) as [
  (typeof TRAVEL_REGIONS)[number]["value"],
  ...(typeof TRAVEL_REGIONS)[number]["value"][],
];

export const PAGE_SIZE = 6;
export const TITLE_MAX = 80;
export const BODY_MAX = 2000;
export const SEARCH_MAX = 80;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BUCKET = "travel-post-images";

export const IMAGE_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageMime = keyof typeof IMAGE_MIME;
export type TravelRegion = (typeof TRAVEL_REGIONS)[number]["value"];
export type PostSort = "latest" | "oldest";

export type TravelPost = {
  id: string;
  title: string;
  region: TravelRegion;
  body: string;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PostDraft = {
  title: string;
  region: string;
  body: string;
};

export type PostField = "title" | "region" | "body" | "image";
export type PostFieldErrors = Partial<Record<PostField, string>>;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/;

export function regionLabel(value: string): string {
  return TRAVEL_REGIONS.find((region) => region.value === value)?.label ?? value;
}

export function hasPersonalInfo(value: string): boolean {
  return EMAIL.test(value) || PHONE.test(value);
}

function bounded(empty: string, max: number, tooLong: string) {
  return z
    .string()
    .transform((value) => value.trim())
    .refine((value) => graphemeLength(value) > 0, { message: empty })
    .refine((value) => graphemeLength(value) <= max, { message: tooLong });
}

export const travelPostSchema = z
  .object({
    title: bounded(
      "제목을 입력해주세요.",
      TITLE_MAX,
      `제목은 ${TITLE_MAX}자 이하로 입력해주세요.`,
    ),
    region: z.enum(REGION_VALUES, { message: "지역을 선택해주세요." }),
    body: bounded(
      "내용을 입력해주세요.",
      BODY_MAX,
      `내용은 ${BODY_MAX}자 이하로 입력해주세요.`,
    ),
  })
  .superRefine((value, ctx) => {
    if (hasPersonalInfo(value.title)) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "이메일이나 전화번호는 저장하지 않습니다.",
      });
    }
    if (hasPersonalInfo(value.body)) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "이메일이나 전화번호는 저장하지 않습니다.",
      });
    }
  });

export function fieldErrors(error: z.ZodError): PostFieldErrors {
  const fields: PostFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      (key === "title" || key === "region" || key === "body") &&
      !fields[key]
    ) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function optionalImage(formData: FormData): File | null {
  const value = formData.get("image");
  if (!(value instanceof File)) return null;
  if (value.size === 0 && value.name === "") return null;
  return value;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function imageBytesError(type: string, bytes: Uint8Array): string | null {
  if (bytes.byteLength === 0) return "이미지 파일을 읽을 수 없습니다.";
  if (bytes.byteLength > IMAGE_MAX_BYTES) {
    return "이미지는 5MB 이하만 올릴 수 있습니다.";
  }
  if (!(type in IMAGE_MIME)) {
    return "JPG, PNG, WEBP 이미지만 올릴 수 있습니다.";
  }

  const jpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
  const png = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  const webp =
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const matches =
    (type === "image/jpeg" && jpeg) ||
    (type === "image/png" && png) ||
    (type === "image/webp" && webp);
  if (!matches) return "이미지 파일 형식을 확인할 수 없습니다.";
  return null;
}

export async function imageError(file: File): Promise<string | null> {
  return imageBytesError(file.type, new Uint8Array(await file.arrayBuffer()));
}

export function excerpt(value: string, max = 90): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (graphemeLength(trimmed) <= max) return trimmed;
  const seg = new Intl.Segmenter("ko", { granularity: "grapheme" });
  let out = "";
  let count = 0;
  for (const part of seg.segment(trimmed)) {
    if (count === max) break;
    out += part.segment;
    count += 1;
  }
  return `${out}…`;
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}
