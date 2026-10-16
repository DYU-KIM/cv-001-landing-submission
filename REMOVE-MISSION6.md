# 미션 제출용 코드 삭제 표시

이 파일은 `yuyoo-K/cv-001-landing`에만 있다.
사용자가 “미션 제출용으로 만들었던 코드 삭제해줘”라고 하면 이 절차만 따른다.

제출용 저장소 `DYU-KIM/cv-001-landing-submission`은 삭제하지 않는다.
그 저장소로 코드를 옮긴 상태이며, 제출본으로 남겨 둔다.

## 삭제하면 되는 기준

미션 6용 여행 정보 CRUD는 커밋 `bc7a914` 다음에 추가되었다.
`bc7a914`가 설문 랜딩만 있는 마지막 상태다.

오늘 추가된 커밋:

- `2e9f140` 여행 정보 글 CRUD
- `a199158` QA 결과 문서
- 이 파일을 추가한 커밋

## 지울 파일

아래 경로는 저장소에서 삭제한다.

- `REMOVE-MISSION6.md`
- `CONTEXT.md`
- `src/app/posts/`
- `src/components/SiteHeader.tsx`
- `src/components/posts/`
- `src/lib/travel-post-contract.ts`
- `src/lib/travel-posts.ts`
- `supabase/migrations/2026-10-16-travel-post.sql`

## 설문 랜딩 상태로 되돌릴 파일

아래 파일은 `bc7a914` 내용으로 되돌린다. 일부만 손으로 지우지 않는다.

- `AGENTS.md`
- `README.md`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/lib/store.ts`
- `supabase/schema.sql`

PowerShell에서 이 저장소 루트로 실행한다.

```powershell
git restore --source=bc7a914 --worktree --staged -- AGENTS.md README.md src/app/layout.tsx src/app/page.tsx src/lib/store.ts supabase/schema.sql
git rm -r --ignore-unmatch REMOVE-MISSION6.md CONTEXT.md src/app/posts src/components/SiteHeader.tsx src/components/posts src/lib/travel-post-contract.ts src/lib/travel-posts.ts supabase/migrations/2026-10-16-travel-post.sql
```

되돌린 뒤 `git diff bc7a914`에 미션 6 파일이 남지 않았는지 확인한다.
설문 API, `src/components/SurveyFlow.tsx`, `supabase/schema.sql`의 설문 테이블은 유지한다.

## 지우면 안 되는 것

- `DYU-KIM/cv-001-landing-submission` 저장소
- Supabase 테이블 `travel_post`
- Storage 버킷 `travel-post-images`
- `.env.local`과 Vercel 환경 변수

데이터베이스 삭제는 사용자가 따로 요청할 때만 한다.
제출용 저장소를 같은 Supabase로 배포하면 테이블을 지우는 순간 제출본도 깨진다.

## 버셀

이 저장소를 푸시하면 https://cv-001-landing.vercel.app 이 다음 배포에서 여행 정보 화면 없이 다시 배포된다.
사용자가 푸시를 말하기 전에는 푸시하지 않는다.
