-- CV-001 · 첫 출처·후속 출처에서 `기타`를 고른 경우의 서술을 저장한다.
--
-- 2026-09-02 개정본을 이미 적용한 프로젝트에서 이 두 줄을 추가로 실행한다.
-- 되돌리기:
--   alter table survey_response drop column src_first_other;
--   alter table survey_response drop column src_next_other;

alter table survey_response add column if not exists src_first_other text;
alter table survey_response add column if not exists src_next_other  text;
