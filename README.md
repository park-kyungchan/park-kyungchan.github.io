# 탐구랩 (Tamgu Labs) — 인터랙티브 기하 탐구 플랫폼

**탐구랩(Tamgu Labs)**은 중학교 수학 과정의 시각적·직관적 기하 탐구를 지원하는 웹 기반 인터랙티브 학습 플랫폼입니다.

- **파일럿 랩**: **입체 탐구랩 (Solid Geometry Lab)** — 다면체, 회전체, 단면, 최단거리 9개 챕터
- **특징**: 빌드리스 ES 모듈 기반 멀티 랩 셸, three.js 3D 엔진, 오프라인 호환 Self-Contained 뷰어 지원

---

## 🤖 에이전트 개발 진입점 (AI Agent Entrypoint)

AI 에이전트 및 시스템 기여자는 코드 작업 전 반드시 아래 문서를 가장 먼저 참조해야 합니다:

👉 **[`docs/00_ROUTING.md`](docs/00_ROUTING.md)** (Agent Context Router)

---

## 📁 저장소 구조 (Repository Structure)

| 경로 | 내용 |
| :--- | :--- |
| [`docs/`](docs/) | 설계 아키텍처 및 로드맵 문서 세트 (`00_ROUTING.md` ~ `07_DESIGN_TOKENS.md`) |
| [`platform/`](platform/) | 빌드리스 ES 모듈 기반 탐구랩 플랫폼 (진입점 `platform/index.html`, Shell, Labs, Packages) |
| [`handoff/`](handoff/) | R010 Standalone 빌드 산출물 (`index.html`, `src/`) |
| [`archive/`](archive/) | 구 버전 보존소 (`archive/legacy-r009/` 단일파일 빌드 체계 이관 데이터) |
| [`index.html`](index.html) | Standalone R010 폴백 진입점 |

---

## 🚀 배포 및 실행 (Deployment)

- **GitHub Pages**: `.github/workflows/deploy.yml`을 통해 `platform/` 앱이 자동 배포됩니다.
- **오프라인 실행**: `index.html` 또는 `handoff/index.html` 단일 파일은 외부 네트워크 없이 오프라인 브라우저에서 바로 동작합니다.
