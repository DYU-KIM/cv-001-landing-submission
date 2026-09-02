-- CV-001 · 샘플 신청을 여행 시점과 무관하게 열면서 필요 시점을 선택 입력으로 바꾼다.
--
-- 2026-09-02 개정본을 이미 적용한 프로젝트에서 이 한 줄만 추가로 실행한다.
-- 되돌리기: alter table sample_request alter column needed_by set not null;
--          (비어 있는 행이 있으면 먼저 채워야 한다)

alter table sample_request alter column needed_by drop not null;
