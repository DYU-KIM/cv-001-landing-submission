# 미션 제출 작업 전체 되돌리기

이 파일은 `yuyoo-K/cv-001-landing`에만 있다.
사용자가 “미션 제출용으로 만들었던 코드 삭제해줘” 또는 같은 뜻으로 오늘 미션 작업을 지우라고 하면, 코드만 지우지 말고 아래 전체를 2026-10-16 작업 전 상태로 되돌린다.

제출용 저장소 `DYU-KIM/cv-001-landing-submission`의 Git 내용은 삭제하거나 되돌리지 않는다.
그 저장소는 제출본으로 남겨 둔 복사본이다.

## 작업 전 상태

기준 커밋은 `bc7a914`다. 그 커밋은 설문 랜딩만 있다.

2026-10-16에 이 환경에 추가된 것은 다음뿐이다.

- 이 저장소에서 `bc7a914` 이후의 커밋. 여행 정보 CRUD, QA 문서, 이 되돌리기 파일이 들어 있다.
- 기존 Supabase 프로젝트의 테이블 `travel_post`, 인덱스, 트리거 `travel_post_touch`, 그 테이블의 RLS
- 비공개 Storage 버킷 `travel-post-images`와 그 안의 파일
- 위 커밋을 푸시해서 바뀐 https://cv-001-landing.vercel.app 배포

환경 변수는 추가하지 않았다. `.env.local`과 Vercel의 기존 값은 유지한다.
`touch_updated_at` 함수와 설문 테이블은 원래 있던 것이므로 지우지 않는다.

## 1. 이 저장소의 파일

PowerShell에서 이 저장소 루트로 실행한다.

```powershell
git restore --source=bc7a914 --worktree --staged -- AGENTS.md README.md src/app/layout.tsx src/app/page.tsx src/lib/store.ts supabase/schema.sql
git rm -r --ignore-unmatch REMOVE-MISSION6.md CONTEXT.md src/app/posts src/components/SiteHeader.tsx src/components/posts src/lib/travel-post-contract.ts src/lib/travel-posts.ts supabase/migrations/2026-10-16-travel-post.sql
```

커밋 히스토리를 강제로 지우거나 `git reset --hard`로 푸시하지 않는다.
되돌린 내용을 새 커밋으로 남긴다. 커밋 후 `git diff bc7a914` 결과가 비어 있어야 한다.

설문 API, `src/components/SurveyFlow.tsx`, 설문 테이블 SQL은 `bc7a914` 내용 그대로 남아 있어야 한다.

## 2. Supabase

연결된 기존 프로젝트의 SQL Editor에서 실행한다.
설문 응답 테이블은 이 문에 없다.

```sql
drop trigger if exists travel_post_touch on travel_post;
drop table if exists travel_post;

delete from storage.objects where bucket_id = 'travel-post-images';
delete from storage.buckets where id = 'travel-post-images';
```

`touch_updated_at` 함수는 삭제하지 않는다.

확인한다.

- `travel_post` 조회가 되지 않는다.
- 버킷 목록에 `travel-post-images`가 없다.
- `survey_response` 행은 그대로다.

이 데이터베이스는 제출용 저장소가 나중에 같은 환경 변수로 배포되면 그 배포도 함께 쓴다.
테이블과 버킷을 지우면 제출용 복사본의 여행 정보 기능도 저장할 곳이 없어진다.
그래도 이 절차에서는 지운다. 오늘 작업 전 데이터베이스에는 그 테이블과 버킷이 없었다.

## 3. Vercel

파일 되돌리기를 이 저장소 `yuyoo-K/cv-001-landing`의 `master`에 푸시한다.
푸시가 끝나 다음 배포가 완료되면 https://cv-001-landing.vercel.app 은 여행 정보 화면이 없는 설문 랜딩으로 돌아간다.
`/posts`는 없어야 한다.

제출용 저장소에는 푸시하지 않는다.
Vercel 환경 변수는 변경하지 않는다.

## 완료 확인

- 이 저장소의 작업 트리가 `bc7a914`와 같다.
- `travel_post`와 `travel-post-images`가 없다.
- 배포된 사이트에 여행 정보 메뉴와 `/posts`가 없다.
- 설문 랜딩과 기존 설문 저장은 동작한다.
- `DYU-KIM/cv-001-landing-submission`의 커밋은 그대로다.
