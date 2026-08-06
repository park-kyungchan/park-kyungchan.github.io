# 03_SCAFFOLDING — Dynamic Scaffolding 설계

## 원칙 (사용자 확정)
1. 수학적 판정은 **100% deterministic 룰** — LLM이 정답 여부를 판단하는 일은 없다.
2. LLM은 룰이 분류한 상태에 대한 **서술형 힌트 생성만** 담당. 호출은 백엔드 프록시 경유(05).
3. programmatic tool-call 방식으로 토큰 최적화 — LLM에는 원문 대화가 아니라 **구조화된 상태 스냅샷**만 보낸다.
4. 백엔드/LLM 불가 시에도 룰 트리의 정적 힌트로 완전 동작 (offline-first).

## Branch Tree 모델
챕터당 1개 이상의 ScaffoldTree. 트리는 JSON 정적 자산 (`labs/solid/scaffolds/*.json`).

```ts
interface ScaffoldTree {
  id: string; chapterId: string; version: number;
  goal: string;                      // 탐구 목표 (교과서 톤)
  nodes: Record<NodeId, ScaffoldNode>;
  root: NodeId;
}
interface ScaffoldNode {
  id: NodeId;
  depth: number;                     // 0 = 목표 제시, 커질수록 더 구체적 지원
  probe: Predicate;                  // deterministic 판정 (아래)
  onPass: NodeId | "COMPLETE";
  onFail: Branch[];                  // 오답/막힘 패턴별 분기 — 다양성의 원천
  hint: { static: string;            // 항상 존재 (오프라인 폴백)
          llm?: LlmHintSpec };       // 있으면 동적 생성 시도
}
interface Branch { when: Predicate; to: NodeId; label: string }
```

### Predicate = 룰 엔진
챕터 상태(현재 입체, 슬라이더 값, 시도 이력, 응답값)에 대한 순수 함수 조합:
`equals / within / countMatches / usedControl / idleFor / attempts >= n` 등 연산자 화이트리스트.
JSON으로 직렬화 가능해야 함 (트리 = 데이터, 코드 아님). 예:
```json
{ "op": "within", "path": "section.sides", "target": 6, "tol": 0 }
```

### 깊이 규약 (04 스키마의 축)
- depth 0: 목표만 제시 (개입 없음)
- depth 1: 방향 질문 ("어느 평면으로 잘랐는지 다시 보자")
- depth 2: 조작 지시 ("평면 위치를 꼭짓점 쪽으로 옮겨 보자")
- depth 3: 부분 풀이 노출
- depth 4: 전체 풀이 + 재시도 유도
트리는 이 5단계 규약을 따른다. **도달 최대 깊이가 학생의 자립도 지표** — 추적 데이터의 핵심.

## LLM Adapter (programmatic tool-call)
```
POST /api/hint
{ treeId, nodeId, stateSnapshot,        // 화이트리스트 필드만, ~300 tokens 상한
  history: NodeId[] }                    // 경로만, 대화록 아님
→ { hint: string }                       // 1~2문장, 교과서 톤 시스템 프롬프트는 서버 보관
```
- 프롬프트·모델 선택·캐싱(동일 nodeId+상태 해시 → 캐시 히트)은 전부 서버 책임 → 프론트 배포 없이 튜닝.
- 실패/타임아웃 1.5s → `hint.static` 폴백. UI는 차이를 드러내지 않음.

## 챕터 연동
ScaffoldSession이 ChapterCtx 상태를 구독 → probe 평가 → 노드 전이 → 학습 노트 패널의 "탐구 질문/힌트" 영역을 구동. 기존 정적 질문/풀이는 depth 0/4 콘텐츠로 흡수됨.
