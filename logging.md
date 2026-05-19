# 백엔드 로깅 구조

## 개요

vibr API 서버(NestJS)의 로깅은 Pino 기반으로 구성됩니다.

| 레이어 | 구현체 | 역할 | 출력 |
|--------|--------|------|------|
| **HTTP 요청 로깅** | `pino-http` 미들웨어 | 모든 요청의 IP·경로·상태코드·응답시간·userId 자동 기록 | stdout (JSON) |
| **에러 로깅** | `AllExceptionsFilter` | 서버 에러(5xx) 구조화 기록 | stdout (JSON) |
| **서비스 로깅** | pino child logger | 서비스 단위 디버그·경고 | stdout (JSON) |

모든 로그는 한 줄 JSON으로 출력되어 Elasticsearch, Loki, CloudWatch 등 수집 도구에 바로 연동할 수 있습니다.

---

## 1. 글로벌 설정 (`main.ts`)

```ts
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

app.use(pinoHttp({
  logger,
  customProps: (req) => ({ userId: req.user?.sub ?? null }),
}));
app.useGlobalFilters(new AllExceptionsFilter(logger));
```

`ApiLogInterceptor`는 제거되고 `pino-http` 미들웨어가 대체합니다.

---

## 2. HTTP 요청 로깅 — `pino-http`

모든 요청이 완료되면 자동으로 기록합니다. 별도 interceptor 구현 없이 동작합니다.

### 기록 항목

| 항목 | 설명 |
|------|------|
| `req.remoteAddress` | 요청자 IP |
| `userId` | JWT에서 추출한 사용자 ID (비로그인 시 `null`) |
| `req.url` | 요청 경로 |
| `req.method` | HTTP 메서드 |
| `res.statusCode` | 응답 상태 코드 |
| `responseTime` | 응답 소요 시간 (ms) |

### 출력 예시

```json
{"level":30,"time":1747656000000,"userId":"uuid-1234","req":{"method":"GET","url":"/api/feed","remoteAddress":"::1"},"res":{"statusCode":200},"responseTime":45,"msg":"request completed"}
```

---

## 3. 에러 로깅 — `AllExceptionsFilter`

```
apps/api/src/common/filter/all-exception.filter.ts
```

pino 인스턴스를 생성자로 주입받아 사용합니다.

### 동작 방식

```
예외 발생
  ├─ HttpException?
  │  ├─ status >= 500 → logger.error({ err, method, url })
  │  └─ status < 500  → 로깅 없이 응답만 반환
  │
  └─ 그 외 (DB 에러, 런타임 에러 등)
     → logger.error({ err, method, url })
     → 500 응답 반환
```

### 출력 예시

```json
{"level":50,"time":1747656000000,"err":{"message":"...","stack":"..."},"method":"GET","url":"/api/feed","msg":"HTTP 500"}
```

### 로깅 정책

- **5xx만 기록**: 4xx(클라이언트 오류)는 로깅하지 않음
- 에러 객체가 JSON 필드로 구조화되어 스택 트레이스도 파싱 가능

---

## 4. 서비스 레벨 로깅 — child logger

pino의 child logger로 같은 인스턴스를 공유하면서 `context` 필드만 다르게 붙입니다.

```ts
@Injectable()
export class AuthService {
  private readonly logger = rootLogger.child({ context: 'AuthService' });

  async exchange(code: string, verifier: string) {
    if (!res.ok) {
      this.logger.warn({ status: res.status }, 'Google token exchange failed');
    }
  }
}
```

### 출력 예시

```json
{"level":40,"time":1747656000000,"context":"AuthService","status":401,"msg":"Google token exchange failed"}
```

### 주요 사용 위치

| 파일 | 레벨 | 상황 |
|------|------|------|
| `AuthService` | `warn` | Google OAuth 토큰 교환 실패 |
| `AlgorithmStreamConsumer` | `error` | Consumer Group 생성 실패, 배치 처리 에러 |
| `AllExceptionsFilter` | `error` | 5xx 에러 발생 |

---

## 5. 로그 레벨

| 레벨 | 값 | 용도 |
|------|----|------|
| `debug` | 20 | 개발 환경 상세 정보 |
| `info` | 30 | 정상 요청 기록 |
| `warn` | 40 | 비정상이지만 허용 가능한 상황 |
| `error` | 50 | 서버 에러 |

프로덕션(`NODE_ENV=production`)에서는 `info` 이상만 출력합니다.
