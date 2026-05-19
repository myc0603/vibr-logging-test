# vibr-logging-test

vibr API 서버 로그 수집/파이프라인 테스트용 로그 생성기.

pino 형식의 한 줄 JSON 로그를 초기 1000개 즉시 출력한 뒤, 이후 주기적으로 계속 출력한다.

## 사용법

```bash
node generate-logs.js
```

파일로 저장하려면:

```bash
node generate-logs.js > out.log
```

## 동작 방식

1. **초기 1000개** — 즉시 출력. 타임스탬프는 2026-05-19 00:00 기준 가상 시각(Unix ms).
2. **이후 연속 출력** — 0.5~3초 간격으로 1~5개씩 랜덤 출력. 타임스탬프는 `Date.now()` 실제 시각.

모든 로그는 **stdout**, **한 줄 JSON**. stderr 없음.

## 출력 형식

logging.md에 정의된 vibr 백엔드 pino 로깅 구조를 따른다.

### 1. HTTP 정상 요청 — `level: 30`

```json
{
  "level": 30,
  "time": 1779148800300,
  "userId": "a1b2c3d4-0000-0000-0000-000000000001",
  "req": {
    "method": "GET",
    "url": "/api/feed",
    "remoteAddress": "192.168.1.10"
  },
  "res": { "statusCode": 200 },
  "responseTime": 45,
  "msg": "request completed"
}
```

### 2. 서비스 warn — `level: 40`

```json
{
  "level": 40,
  "time": 1779148802759,
  "context": "AuthService",
  "status": 401,
  "msg": "Google token exchange failed"
}
```

```json
{
  "level": 40,
  "time": 1779148803100,
  "context": "TrendingStreamConsumer",
  "queueDepth": 3200,
  "lagMs": 850,
  "msg": "Event processing delayed"
}
```

### 3. HTTP 5xx 에러 — `level: 50`

```json
{
  "level": 50,
  "time": 1779148815684,
  "err": {
    "message": "QueryFailedError: ER_LOCK_DEADLOCK",
    "stack": "InternalServerErrorException: QueryFailedError: ER_LOCK_DEADLOCK\n    at Object.<anonymous> (/app/apps/api/src/common/filter/all-exception.filter.ts:42:18)\n    at async /app/apps/api/src/main.ts:12:3"
  },
  "method": "GET",
  "url": "/api/feed",
  "msg": "HTTP 500"
}
```

### 4. 서비스 error — `level: 50`

```json
{
  "level": 50,
  "time": 1779148913541,
  "context": "AlgorithmStreamConsumer",
  "err": {
    "message": "Consumer group creation failed: BUSYGROUP Consumer Group name already exists",
    "stack": "Error: Consumer group creation failed: BUSYGROUP Consumer Group name already exists\n    at Object.<anonymous> (/app/apps/api/src/common/filter/all-exception.filter.ts:42:18)\n    at async /app/apps/api/src/main.ts:12:3"
  },
  "msg": "Consumer group creation failed: BUSYGROUP Consumer Group name already exists"
}
```

> level 3, 4번은 모두 `level: 50`이며 `context` 필드 유무로 구분한다.

## 로그 분포

초기 배치와 연속 출력 모두 동일한 비율을 유지한다.

| 타입 | 개수 (초기) | 비율 |
|------|------------|------|
| HTTP 정상 요청 (`level: 30`) | 820 | 82% |
| 서비스 warn (`level: 40`) | 50 | 5% |
| HTTP 5xx 에러 (`level: 50`, HTTP) | 100 | 10% |
| 서비스 error (`level: 50`, 서비스) | 30 | 3% |
| **합계** | **1000** | |

HTTP 요청 로그는 feed, post, comment, like, follow, user, playlist, noti, auth, nowPlaylist 등 전 엔드포인트를 커버하며, 매 실행마다 순서가 랜덤하게 섞인다.

## 참고 문서

- [api.md](api.md) — vibr API 엔드포인트 목록
- [logging.md](logging.md) — vibr 백엔드 로깅 구조
