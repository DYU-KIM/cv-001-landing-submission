/**
 * 여행 정보 글 저장소.
 *
 * 운영 데이터는 Supabase Postgres와 Storage에만 둔다.
 * 환경변수가 없으면 로컬 파일로 대체하지 않고 오류를 반환한다.
 *
 * 접근은 서버의 service role만 한다. 사용자별 RLS는 미션 7에서 적용한다.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabase } from "./store";
import {
  BUCKET,
  IMAGE_MIME,
  PAGE_SIZE,
  type ImageMime,
  type PostSort,
  type TravelPost,
  type TravelRegion,
} from "./travel-post-contract";

type TravelPostRow = Omit<TravelPost, "image_url">;

export type PostListQuery = {
  page: number;
  region: TravelRegion | "";
  q: string;
  sort: PostSort;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function db() {
  const client = getSupabase();
  if (!client) {
    throw new Error("데이터베이스가 연결되어 있지 않습니다.");
  }
  return client;
}

function ilikePattern(value: string): string {
  const escaped = value.replace(/[%_\\]/g, (char) => `\\${char}`).replaceAll('"', "");
  return `"%${escaped}%"`;
}

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db()
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 6);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function decorate(row: TravelPostRow): Promise<TravelPost> {
  return { ...row, image_url: await signedUrl(row.image_path) };
}

export async function listTravelPosts(
  query: PostListQuery,
): Promise<{ posts: TravelPost[]; total: number }> {
  const from = (query.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let request = db().from("travel_post").select("*", { count: "exact" });
  if (query.region) request = request.eq("region", query.region);
  if (query.q) {
    const pattern = ilikePattern(query.q);
    request = request.or(`title.ilike.${pattern},body.ilike.${pattern}`);
  }
  const { data, error, count } = await request
    .order("created_at", { ascending: query.sort === "oldest" })
    .range(from, to);
  if (error) throw new Error("여행 정보 목록을 불러오지 못했습니다.");
  const posts = await Promise.all((data as TravelPostRow[] | null ?? []).map(decorate));
  return { posts, total: count ?? 0 };
}

export async function getTravelPost(id: string): Promise<TravelPost | null> {
  const row = await getTravelPostRow(id);
  if (!row) return null;
  return decorate(row);
}

async function getTravelPostRow(id: string): Promise<TravelPostRow | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db()
    .from("travel_post")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("여행 정보를 불러오지 못했습니다.");
  return (data as TravelPostRow | null) ?? null;
}

async function uploadImage(
  id: string,
  type: ImageMime,
  bytes: Uint8Array,
): Promise<string> {
  const ext = IMAGE_MIME[type];
  const path = `${id}/${randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, Buffer.from(bytes), {
    contentType: type,
    upsert: false,
  });
  if (error) throw new Error("이미지를 올리지 못했습니다. 잠시 후 다시 시도해주세요.");
  return path;
}

async function removeImage(path: string | null) {
  if (!path) return;
  await db().storage.from(BUCKET).remove([path]);
}

export type UploadedImage = { type: ImageMime; bytes: Uint8Array };

export async function createTravelPostRow(input: {
  title: string;
  region: TravelRegion;
  body: string;
  image: UploadedImage | null;
}): Promise<string> {
  const id = randomUUID();
  let imagePath: string | null = null;
  if (input.image) imagePath = await uploadImage(id, input.image.type, input.image.bytes);
  const { error } = await db().from("travel_post").insert({
    id,
    title: input.title,
    region: input.region,
    body: input.body,
    image_path: imagePath,
  });
  if (error) {
    await removeImage(imagePath);
    throw new Error("여행 정보를 저장하지 못했습니다.");
  }
  return id;
}

export async function updateTravelPostRow(input: {
  id: string;
  title: string;
  region: TravelRegion;
  body: string;
  image: UploadedImage | null;
  removeImage: boolean;
}): Promise<"missing" | "ok"> {
  const existing = await getTravelPostRow(input.id);
  if (!existing) return "missing";

  let imagePath = existing.image_path;
  let uploaded: string | null = null;
  if (input.image) {
    uploaded = await uploadImage(existing.id, input.image.type, input.image.bytes);
    imagePath = uploaded;
  } else if (input.removeImage) {
    imagePath = null;
  }

  const { error } = await db()
    .from("travel_post")
    .update({
      title: input.title,
      region: input.region,
      body: input.body,
      image_path: imagePath,
    })
    .eq("id", existing.id);
  if (error) {
    await removeImage(uploaded);
    throw new Error("여행 정보를 수정하지 못했습니다.");
  }

  if (uploaded && existing.image_path) await removeImage(existing.image_path);
  if (!input.image && input.removeImage) await removeImage(existing.image_path);
  return "ok";
}

export async function deleteTravelPostRow(id: string): Promise<boolean> {
  const existing = await getTravelPostRow(id);
  if (!existing) return false;
  const { error } = await db().from("travel_post").delete().eq("id", existing.id);
  if (error) throw new Error("여행 정보를 삭제하지 못했습니다.");
  await removeImage(existing.image_path);
  return true;
}
