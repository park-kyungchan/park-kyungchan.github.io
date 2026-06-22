# KG 데이터 계약 (kg-data 스키마)

> 3D/2D 렌더러는 **오직 이 계약**만 의존합니다. 노드 id·내용은 코드에 하드코딩되어 있지 않으므로,
> 이 형식만 지키면 다른 학생의 Ontology로 `kg-data.js`를 교체해도 **코드 수정 없이 동일하게 렌더링**됩니다.

렌더러가 읽는 전역 객체는 두 개입니다: `window.__KGGRAPH`, `window.__KGSTATE`.

---

## 1. `window.__KGGRAPH` — 그래프 구조

```js
var __KGGRAPH = {
  nodes: [ /* Node[] */ ],
  edges: [ /* Edge[] */ ]
};
```

### Node
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 전역 고유 식별자. edge의 `s`/`t`가 이 값을 참조 |
| `label` | string | ✅ | 화면 표시명(툴팁·라벨·상세 패널) |
| `role` | string | ⬜ | 자유 텍스트 설명(상세 패널에 표기). 예: `"central concept"` |
| `layer` | enum | ✅ | 노드 분류. 색·크기 인코딩 → **아래 4개 중 하나** |
| `topic` | string | ⬜ | 토픽 군집/클러스터 레이아웃의 X축 그룹 키. 예: `"function"`, `"equation"` |

**`layer` enum** (그 외 값은 `DATA`로 폴백):
| 값 | 의미 | 색 | 상대 크기 |
|---|---|---|---|
| `DATA` | 개념 | `#7048E8` | 6.0 |
| `LOGIC` | 논리 | `#2A6FDB` | 3.4 |
| `ACTION` | 동작 | `#1F8A5B` | 3.4 |
| `PROBLEM` | 문제 | `#D9911F` | 2.8 |

### Edge
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `s` | string | ✅ | 출발 노드 `id` (저장 방향, source) |
| `t` | string | ✅ | 도착 노드 `id` (저장 방향, target) |
| `kind` | enum | ✅ | 관계 종류. 흐름 방향(`flowDir`)을 결정 |

**`kind` enum 과 흐름 방향** (DIRECTION-MODEL §A). 흐름 파티클은 "이미 아는 것 → 그것이 가능케 하는 것" 방향으로 흐릅니다.
| `kind` | 저장 `s→t` 의미 | 흐름 방향 |
|---|---|---|
| `has-prerequisite` | 의존→선수 | **reverse** (t→s) |
| `consumes-data` | 동작→데이터 | **reverse** |
| `requires-substitution-trace` | 의존→trace | **reverse** |
| `solves` | 문제→동작 | **reverse** |
| `supports-action` | 근거→동작 | **forward** (s→t) |
| `parameter-affects` | 파라미터→대상 | **forward** |
| `representation-of` | 표현→개념 | **both** |
| `topic-includes` | 토픽→부분 | **both** |
| `topic-bridge` | 토픽A→토픽B | **both** (앰버 강조 렌더) |

> 새 `kind`를 추가하면 기본값은 `forward`로 흐릅니다. 방향을 지정하려면 렌더러의 `FLOWDIR` 맵에 키를 추가하세요.

### atoms (선택) — 노드별 세부 스킬
`__KGGRAPH.atoms`는 `{ "<nodeId>": ["세부 스킬 문자열", ...] }` 형태(선택 필드).
노드(개념)가 실제로 다루는 원자적 학습 항목을 담습니다. 학습 상태 패널의 **"여기서 익히는 것"** 목록에 사용됩니다.

> 현재 atoms는 **문자열 배열**이라 항목별 숙련 상태는 없습니다(상태는 노드 단위).
> 항목별 상태가 필요하면 향후 `{text, status}` 객체 배열로 계약을 확장하세요.

---

## 2. `window.__KGSTATE` — 학생 상태 (파일럿 1명)

```js
var __KGSTATE = {
  meta:  { student: "데모 학생", week: 7, totalWeeks: 16, updated: "2026-06-19",
           title: "일차함수와 일차방정식 — 개념 의존 신경망" },  // title 선택
  state: { "<nodeId>": "<status>", ... },    // 노드 id → 숙련 상태
  focus: [ "<nodeId>", ... ]                  // 선택: 이번 주 학습/약점보강 초점 (아래)
};
```

### meta
| 필드 | 타입 | 설명 |
|---|---|---|
| `student` | string | HUD에 표기되는 학생명 |
| `week` | number | 현재 주차 (HUD `wk7/16`) |
| `totalWeeks` | number | 전체 주차 |
| `updated` | string | 갱신일(표기용) |
| `title` | string | ⬜ 선택. HUD 부제목. 누락 시 일반 문구로 폴백 |

### state — 노드별 숙련 상태 enum (누락 시 `todo`)
| 값 | 의미 | 색 | 모션 | 흐름 방출 |
|---|---|---|---|---|
| `mastered` | 숙련 | `#1F8A5B` | 정적 발광 | ✅ |
| `current` | 이번주 | `#13B5A6` | 맥동 | ✅ |
| `learning` | 학습중 | `#E0A50E` | 부드러운 맥동 | ✅ |
| `weak` | 보강필요 | `#E0443E` | 느린 박동 | — |
| `todo` | 예정 | `#C7C4BC` | 없음(dim) | — |

> 흐름 파티클은 **출발 노드가 충전 상태**(`mastered`/`current`/`learning`)인 엣지에서만,
> 출발 노드의 상태색으로 방출됩니다.

### focus (선택) — 이번 주 학습/약점보강 초점
`__KGSTATE.focus`는 "이번 주 실제로 학습/테스트 중인" 노드 id 배열입니다(선택 필드).
애니메이션의 **흐름 강화·카메라 투어·점화 인트로**가 이 집합을 대상으로 동작합니다.

**focus-set 파생 규칙(단일 지점, swap-safe)**:
1. `focus` 배열이 있으면 → 그 노드들이 focus-set (교수자가 명시 지정).
2. 없으면 → 상태가 `current`/`learning`/`weak` 인 노드에서 자동 파생(폴백).

> 렌더러는 노드 id를 하드코딩하지 않으므로, 학생별 KG를 교체하면 focus-set도 자동 재계산됩니다.

---

## 3. 교체 절차
1. 위 형식으로 새 학생의 `__KGGRAPH` / `__KGSTATE`를 만든다.
2. `kg-data.js`를 통째로 교체(또는 `<script src>`를 새 파일로 교체).
3. 끝. 레이아웃·색·흐름·필터·레이아웃 모드가 자동으로 새 데이터에 맞춰 재계산됩니다.

**불변식**: 모든 `edge.s`/`edge.t`는 존재하는 `node.id`를 가리켜야 합니다(없는 엣지는 자동 무시). `id`는 고유해야 합니다.
