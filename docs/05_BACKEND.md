# 05_BACKEND — Hostinger VPS 백엔드

## 결론
가능하며 권장. LLM API 키를 정적 프론트에 둘 수 없으므로(노출), **LLM 프록시**만으로도 백엔드 존재 이유가 성립. 추적 저장이 두 번째 역할.

## 구성 (Docker Compose, 컨테이너 3개)
```yaml
services:
  api:      # FastAPI(Python) 권장 — 룰/스키마 검증 + LLM 프록시 + traversal 수집
  db:       # PostgreSQL 16 (traversal JSONB 저장) — 초기엔 SQLite 볼륨도 무방
  proxy:    # Caddy — 자동 HTTPS(Let's Encrypt), 도메인 예: api.tamgu.example
```

## API 표면 (전체)
```
POST /api/hint          # 03의 LLM Adapter. 서버측 캐시(상태해시) + rate limit
POST /api/traversals    # 04 레코드 배치 수집. dedupe upsert
GET  /api/health
```
이 3개 외 엔드포인트 추가 금지(스코프 가드).

## 보안·운영 체크리스트
- CORS: `https://park-kyungchan.github.io` (+커스텀 도메인)만 허용
- 인증: 공개 랩이므로 익명 — 대신 rate limit(IP+sessionId) + 요청 스키마 엄격 검증(Pydantic)
- LLM 키·프롬프트는 서버 env — 프론트 배포와 독립적으로 교체 가능
- 백업: pg_dump cron → VPS 로컬 + 주기적 오프사이트
- 관측: api 컨테이너 구조화 로그 + Caddy access log로 시작 (도구 추가는 필요 시)

## Degradation 계약 (필수)
| 백엔드 상태 | 랩 동작 |
|---|---|
| 정상 | 동적 힌트 + 자동 동기화 |
| 다운/미배포 | 정적 힌트 폴백 + IndexedDB 적재, 복구 시 재동기화 |
프론트는 백엔드 부재를 기능 저하로만 경험 — 오류 화면 금지.
