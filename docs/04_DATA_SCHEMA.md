# 04_DATA_SCHEMA — 감사/추적 데이터셋

## 수집 범위 (사용자 확정 — 절대 준수)
**스캐폴딩 branch 경로와 도달 깊이만 수집한다.** 그 외(조작 이벤트, 체류시간, 화면 로그 등) 일체 수집 금지. 새 필드 추가는 이 문서 개정 + 사용자 승인 필수.

## 레코드: ScaffoldTraversal (1 트리 세션 = 1 레코드)
```ts
interface ScaffoldTraversal {
  v: 1;                              // 스키마 버전
  sessionId: string;                 // 익명 UUID (기기 로컬 생성, PII 없음)
  labId: string; chapterId: string;
  treeId: string; treeVersion: number;
  startedAt: string;                 // ISO 8601
  path: Step[];                      // 시간순 노드 전이
  maxDepth: number;                  // 경로 중 최대 node.depth ← 핵심 지표
  terminal: "COMPLETE" | "ABANDONED";
  completedAt: string | null;
}
interface Step {
  node: string;                      // NodeId
  depth: number;
  via: "pass" | "fail:" + branchLabel;  // 어느 분기로 왔는지
  at: string;                        // ISO 8601 (경로 재구성용 타임스탬프만 허용)
}
```
`Step.at`은 "경로를 시간순으로 감사"하기 위한 최소 정보로 포함. 체류시간 파생은 서버 분석 단계에서만.

## 저장 계층
1. **로컬 우선**: IndexedDB에 즉시 기록 (오프라인 완전 동작). localStorage에는 진행 상태 요약만.
2. **동기화**: 백엔드 가용 시 `POST /api/traversals` 배치 업로드(레코드 단위, at-least-once + 서버 dedupe by `sessionId+treeId+startedAt`).
3. **내보내기**: 교사용 JSON 내보내기 버튼 (백엔드 없이도 1:1 지도에서 수거 가능).

## 파생 지표 (서버 분석 전용 — 클라이언트는 raw 레코드만)
- 트리별 depth 분포 (자립도), fail-branch 빈도 상위 (오개념 지도), COMPLETE 비율, 재방문 시 depth 변화 (성장).

## 프라이버시
PII 0. sessionId는 기기 로컬 난수 — 계정 개념 없음. 교사 연결은 학생이 내보낸 JSON을 교사가 받는 방향(pull)만.
