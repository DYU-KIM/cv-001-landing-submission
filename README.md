# CV-001 · 일본 자유여행 준비 경험 조사 랜딩·설문

`모두의 창업 프로젝트`(마감 2026-09-17) 제출용 행동실험 페이지다.
정식 서비스가 아니라 **문제 증거와 해결책 행동을 분리해 측정하는 검증 도구**다.

- 사양 원본: `project-docs/projects/local-travel-info-marketplace/01-research/cv-001/LANDING-FORM-CONTRACT-KO.md`
- 실험 계획: 같은 폴더의 `MODOO-APPLICATION-SPRINT.md`
- 문구를 바꿀 때는 계약서를 먼저 고치고 `src/lib/contract.ts`에 반영한다.

## 핵심 구조

`문제 입력 후 해결책 공개`. 문제 응답이 서버에 저장된 뒤에만 샘플 제안 화면이 열린다.

```text
LP-01 랜딩 → SF-00 동의 → SF-01 대상확인 ─(부적격)→ SF-X01 종료
                                    └→ SF-02 사건 → SF-03 정보원 → SF-04 영향
                                         → [서버 저장 완료] → SO-01 샘플 제안
                                              ├─ 요청 안 함 → SO-X01 종료
                                              └─ SR-01 조건 → SR-02 이메일 → SR-X01 완료
```

## 스택

| 항목 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS 4 |
| 검증 | zod (서버·클라이언트 공용) |
| 저장소 | Supabase Postgres (서울 리전 권장) |
| 배포 | Vercel |
| 분석 | 자체 DB 이벤트 로깅만. GA4·Meta 픽셀 등 외부 추적 도구 없음 |

## 실행

```bash
npm install
npm run dev
```

`SUPABASE_URL`이 없으면 `.data/dev-store.json` 파일 저장소로 동작한다. 개발·검증 전용이며 배포에는 쓰지 않는다.

## 동작 검증

```bash
node scripts/smoke.mjs http://localhost:3000
```

정상 흐름, 한글 원문 보존, 해결책 공개 후 잠금, 부적격 분기, 배타 규칙, CSV 저장소 분리를 확인한다.
배포 후에도 실제 URL을 인자로 넘겨 같은 검사를 돌린다.

## 배포 준비

1. Supabase 프로젝트를 **서울(ap-northeast-2)** 리전으로 만든다.
2. SQL Editor에서 `supabase/schema.sql`을 실행한다.
3. Vercel 프로젝트에 환경변수를 넣는다. (`.env.example` 참고)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `EXPORT_KEY` — CSV 내보내기 보호용 임의 문자열
   - `NEXT_PUBLIC_CONTACT_EMAIL` — 동의문·종료화면에 표시할 문의·삭제 요청 주소
4. `service role` 키는 서버에서만 쓴다. 클라이언트 번들에 넣지 않는다.

## 운영

### 응답 내보내기

```bash
curl -o responses.csv "https://<도메인>/api/export?dataset=responses&key=<EXPORT_KEY>"
```

`dataset`은 `responses` / `samples` / `contacts` / `events` 중 하나다.
**문제 응답과 연락처는 서로 다른 파일로 나온다. 한 파일에 합치지 않는다.**

### 보유기간

D-PRIVACY-01 결정에 따라 전 저장소 12개월 보관 후 파기한다.
Supabase SQL Editor에서 `select * from purge_expired();`를 실행하면 기한이 지난 응답과 이벤트가 삭제된다.
개별 삭제 요청은 해당 `response_id` 행을 지우면 연결된 샘플 조건·연락처가 함께 삭제된다.

## 경계

- 회원가입, 결제, 마켓플레이스, SNS 기능은 만들지 않는다.
- 이름·전화번호·생년월일·주소·여권번호는 수집하지 않는다.
- 이벤트 로그에 설문 원문과 이메일을 넣지 않는다.
- 원본 IP와 정확한 위치정보는 저장하지 않는다.
- 검색엔진 색인을 막아둔다. 링크로만 배포한다.
