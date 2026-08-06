# 입체 탐구랩 R010 — 핸드오프 패키지

새 디자인/구조로 전면 리빌드된 랩입니다. 단일 파일 바이트-동일성 계약(R009 이전)은 폐기하고, 일반적인 정적 사이트 구조로 전환합니다.

## 배포 (GitHub Pages)

`index.html` 하나만 repo 루트에 올리면 됩니다. 모든 리소스(폰트, three.js, 데이터, 엔진)가 인라인된 self-contained 파일이라 외부 요청 없이 오프라인에서도 동작합니다.

```bash
git checkout -b r010-redesign
cp index.html <repo>/index.html
git add index.html
git commit -m "R010: 전면 리디자인 — 풀스크린 3D 스테이지 + 플로팅 패널, 수학 위계 기반 9챕터 IA"
git push -u origin r010-redesign
# PR 생성 후 merge
```

기존 `src/*.part` 빌드 체계·CI(`src/build.py --check`)는 이 커밋과 충돌하므로, PR에서 함께 정리하거나 `archive/`로 이동하세요. (CI 워크플로 `.github/workflows/ci.yml`의 바이트-동일성 게이트를 비활성화하지 않으면 push가 red가 됩니다.)

## 무엇이 바뀌었나

- **IA**: 9챕터를 수학적 위계로 재편 — Ⅰ 다면체(관찰실·정다면체 판정·오일러·전개도·단면) / Ⅱ 회전체(생성·단면) / Ⅲ 심화(축구공·최단거리)
- **셸**: 고정 2패널 → 풀스크린 3D 캔버스 + 드래그·플링·최소화 가능한 플로팅 패널(커리큘럼/학습 노트/칠판/컨트롤 독)
- **3D**: 커스텀 WebGL 렌더러(33_runtime_renderer.js.part) → three.js 기반 경량 엔진 `src/lab-engine.js` (다면체/회전체 생성, 평면 단면 계산+캡 채움, 클리핑, 경로 오버레이, 터치 궤도 컨트롤)
- **데이터**: 기존 계약 그대로 사용 — `src/p003-data.js`는 원본 repo의 `src/20/21_*.part`에서 추출한 window.P003_DATA + P003_R009_EXACT
- **모션**: 챕터별 단계형 재생(준비→변화→확인), 카운팅 애니메이션, 회전 스윕, 평면 스위프
- **타이포**: Gaegu(손글씨 정체성 유지) + Gowun Batang(제목) + Noto Sans KR(본문)

## src/ 폴더

향후 유지보수용 소스입니다 (index.html은 이들을 인라인한 빌드 산출물):

- `lab-engine.js` — 3D 엔진 (three.js r128 필요)
- `p003-data.js` — 기하 데이터 페이로드
- `lab-app.dc.html` — 앱 셸/챕터 소스 (Design Component 형식; 편집은 디자인 도구에서)

## 알려진 한계 / 후속 작업

- 정육면체 전개도 11종 변형(원본 22_data R007_NETS, 539KB)은 아직 미이식 — 전개도 챕터는 기본 전개도 1종
- 오일러 증명 타임라인(원본 41_chapter_euler)은 카운팅 시연으로 대체
- 전개도 접기 3D 애니메이션 미이식
- 터치 실기기(태블릿) QA 권장
