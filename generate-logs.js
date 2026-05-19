const { randomUUID } = require('crypto');

// --- helpers ---

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLatency(range) {
  if (range === 'fast') return randomInt(8, 45);
  if (range === 'medium') return randomInt(50, 180);
  return randomInt(200, 520);
}

function statusCodeFor(method) {
  return method === 'POST' ? 201 : 200;
}

const IPS = ['::1', '127.0.0.1', '192.168.1.10', '10.0.0.5', '203.0.113.42', '198.51.100.7'];
const USER_IDS = [
  'a1b2c3d4-0000-0000-0000-000000000001',
  'b2c3d4e5-0000-0000-0000-000000000002',
  'c3d4e5f6-0000-0000-0000-000000000003',
  'd4e5f6a7-0000-0000-0000-000000000004',
  'e5f6a7b8-0000-0000-0000-000000000005',
];
const POST_IDS = Array.from({ length: 10 }, () => randomUUID());
const COMMENT_IDS = Array.from({ length: 8 }, () => randomUUID());
const PLAYLIST_IDS = Array.from({ length: 5 }, () => randomUUID());
const NOTI_IDS = Array.from({ length: 6 }, () => randomUUID());

function userId(loggedIn = true) {
  return loggedIn ? randomFrom(USER_IDS) : null;
}

// --- log emitters ---

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function emitApiLog(method, url, responseTime, uid, time) {
  emit({
    level: 30,
    time,
    userId: uid,
    req: { method, url, remoteAddress: randomFrom(IPS) },
    res: { statusCode: statusCodeFor(method) },
    responseTime,
    msg: 'request completed',
  });
}

function emitWarnLog(context, extraFields, msg, time) {
  emit({ level: 40, time, context, ...extraFields, msg });
}

function emitHttpErrorLog(method, url, message, stack, time) {
  emit({
    level: 50,
    time,
    err: { message, stack },
    method,
    url,
    msg: 'HTTP 500',
  });
}

function emitServiceErrorLog(context, message, stack, time) {
  emit({
    level: 50,
    time,
    context,
    err: { message, stack },
    msg: message,
  });
}

function fakeStack(errorClass, message) {
  return (
    `${errorClass}: ${message}\n` +
    `    at Object.<anonymous> (/app/apps/api/src/common/filter/all-exception.filter.ts:42:18)\n` +
    `    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n` +
    `    at async /app/apps/api/src/main.ts:12:3`
  );
}

// --- scenario pools ---

const BASE = new Date('2026-05-19T00:00:00.000Z').getTime();

let tick = 0;

function ts() {
  tick += randomInt(200, 3000);
  return BASE + tick;
}

// 정상 요청 시나리오 정의 (method, pathFn, latencyRange, needsAuth)
const API_SCENARIOS = [
  // feed (weight 150)
  ...Array(15).fill({ method: 'GET', path: () => '/api/feed', lat: 'medium', auth: false }),
  ...Array(135).fill({ method: 'GET', path: () => '/api/feed', lat: 'medium', auth: true }),

  // post (weight 160)
  ...Array(80).fill({ method: 'GET', path: () => `/api/post/${randomFrom(POST_IDS)}`, lat: 'fast', auth: false }),
  ...Array(30).fill({ method: 'GET', path: () => `/api/post/${randomFrom(POST_IDS)}`, lat: 'fast', auth: true }),
  ...Array(20).fill({ method: 'GET', path: () => `/api/post/user/${randomFrom(USER_IDS)}`, lat: 'fast', auth: false }),
  ...Array(15).fill({ method: 'POST', path: () => '/api/post', lat: 'slow', auth: true }),
  ...Array(10).fill({ method: 'PATCH', path: () => `/api/post/${randomFrom(POST_IDS)}`, lat: 'medium', auth: true }),
  ...Array(5).fill({ method: 'DELETE', path: () => `/api/post/${randomFrom(POST_IDS)}`, lat: 'fast', auth: true }),

  // comment (weight 100)
  ...Array(50).fill({ method: 'GET', path: () => `/api/comment?postId=${randomFrom(POST_IDS)}`, lat: 'fast', auth: false }),
  ...Array(30).fill({ method: 'POST', path: () => '/api/comment', lat: 'medium', auth: true }),
  ...Array(12).fill({ method: 'PATCH', path: () => `/api/comment/${randomFrom(COMMENT_IDS)}`, lat: 'fast', auth: true }),
  ...Array(8).fill({ method: 'DELETE', path: () => `/api/comment/${randomFrom(COMMENT_IDS)}`, lat: 'fast', auth: true }),

  // like (weight 80)
  ...Array(35).fill({ method: 'POST', path: () => '/api/like', lat: 'fast', auth: true }),
  ...Array(25).fill({ method: 'DELETE', path: () => `/api/like/${randomFrom(POST_IDS)}`, lat: 'fast', auth: true }),
  ...Array(20).fill({ method: 'GET', path: () => `/api/like/${randomFrom(POST_IDS)}/users`, lat: 'fast', auth: false }),

  // follow (weight 80)
  ...Array(30).fill({ method: 'POST', path: () => '/api/follow', lat: 'medium', auth: true }),
  ...Array(20).fill({ method: 'DELETE', path: () => '/api/follow', lat: 'fast', auth: true }),
  ...Array(15).fill({ method: 'GET', path: () => `/api/follow/following/${randomFrom(USER_IDS)}`, lat: 'fast', auth: false }),
  ...Array(15).fill({ method: 'GET', path: () => `/api/follow/follower/${randomFrom(USER_IDS)}`, lat: 'fast', auth: false }),

  // user (weight 80)
  ...Array(30).fill({ method: 'GET', path: () => `/api/user/${randomFrom(USER_IDS)}`, lat: 'fast', auth: false }),
  ...Array(25).fill({ method: 'GET', path: () => '/api/user/search?q=test&limit=10', lat: 'fast', auth: false }),
  ...Array(15).fill({ method: 'GET', path: () => '/api/user/me', lat: 'fast', auth: true }),
  ...Array(10).fill({ method: 'PATCH', path: () => '/api/user', lat: 'medium', auth: true }),

  // playlist (weight 70)
  ...Array(20).fill({ method: 'GET', path: () => '/api/playlist', lat: 'fast', auth: true }),
  ...Array(20).fill({ method: 'GET', path: () => `/api/playlist/${randomFrom(PLAYLIST_IDS)}`, lat: 'fast', auth: true }),
  ...Array(12).fill({ method: 'POST', path: () => '/api/playlist', lat: 'medium', auth: true }),
  ...Array(8).fill({ method: 'PATCH', path: () => `/api/playlist/${randomFrom(PLAYLIST_IDS)}`, lat: 'fast', auth: true }),
  ...Array(5).fill({ method: 'DELETE', path: () => `/api/playlist/${randomFrom(PLAYLIST_IDS)}`, lat: 'fast', auth: true }),
  ...Array(5).fill({ method: 'POST', path: () => `/api/playlist/${randomFrom(PLAYLIST_IDS)}/music`, lat: 'medium', auth: true }),

  // noti (weight 40)
  ...Array(25).fill({ method: 'GET', path: () => '/api/noti', lat: 'fast', auth: true }),
  ...Array(10).fill({ method: 'PATCH', path: () => `/api/noti/${randomFrom(NOTI_IDS)}`, lat: 'fast', auth: true }),
  ...Array(5).fill({ method: 'DELETE', path: () => `/api/noti/${randomFrom(NOTI_IDS)}`, lat: 'fast', auth: true }),

  // auth (weight 30)
  ...Array(10).fill({ method: 'GET', path: () => '/api/auth/check', lat: 'fast', auth: false }),
  ...Array(15).fill({ method: 'POST', path: () => '/api/auth/login/tmp', lat: 'fast', auth: false }),
  ...Array(5).fill({ method: 'POST', path: () => '/api/auth/logout', lat: 'fast', auth: false }),

  // nowPlaylist (weight 20)
  ...Array(10).fill({ method: 'PUT', path: () => '/api/nowPlaylist', lat: 'medium', auth: true }),
  ...Array(10).fill({ method: 'GET', path: () => '/api/nowPlaylist', lat: 'fast', auth: true }),

  // music + logs (weight 10)
  ...Array(5).fill({ method: 'POST', path: () => '/api/music', lat: 'medium', auth: false }),
  ...Array(5).fill({ method: 'POST', path: () => '/api/logs', lat: 'fast', auth: true }),
];

// 5xx 에러 시나리오
const ERROR_SCENARIOS = [
  // DB 쿼리 실패 (50)
  ...Array(15).fill({ method: 'GET', path: '/api/feed', msg: 'QueryFailedError: ER_LOCK_DEADLOCK: Deadlock found when trying to get lock', ctx: 'AllExceptionsFilter' }),
  ...Array(10).fill({ method: 'GET', path: () => `/api/post/${randomFrom(POST_IDS)}`, msg: 'QueryFailedError: ER_NO_SUCH_TABLE: Table does not exist', ctx: 'AllExceptionsFilter' }),
  ...Array(10).fill({ method: 'POST', path: '/api/comment', msg: 'QueryFailedError: ER_DUP_ENTRY: Duplicate entry for key', ctx: 'AllExceptionsFilter' }),
  ...Array(8).fill({ method: 'GET', path: '/api/feed', msg: 'QueryFailedError: connect ECONNREFUSED 127.0.0.1:3306', ctx: 'AllExceptionsFilter' }),
  ...Array(7).fill({ method: 'POST', path: '/api/like', msg: 'QueryFailedError: ER_ROW_IS_REFERENCED: Cannot delete or update a parent row', ctx: 'AllExceptionsFilter' }),

  // Redis 연결 오류 (25)
  ...Array(10).fill({ method: 'GET', path: '/api/feed', msg: 'Error: Redis connection lost. Retrying...', ctx: 'AllExceptionsFilter' }),
  ...Array(8).fill({ method: 'GET', path: '/api/noti', msg: 'Error: Redis client is not connected', ctx: 'AllExceptionsFilter' }),
  ...Array(7).fill({ method: 'PUT', path: '/api/nowPlaylist', msg: 'Error: Redis write timeout after 5000ms', ctx: 'AllExceptionsFilter' }),

  // 런타임 에러 (15)
  ...Array(8).fill({ method: 'GET', path: '/api/feed', msg: "TypeError: Cannot read properties of undefined (reading 'id')", ctx: 'AllExceptionsFilter' }),
  ...Array(4).fill({ method: 'POST', path: '/api/post', msg: 'RangeError: Maximum call stack size exceeded', ctx: 'AllExceptionsFilter' }),
  ...Array(3).fill({ method: 'GET', path: () => `/api/playlist/${randomFrom(PLAYLIST_IDS)}`, msg: 'Error: Unexpected end of JSON input', ctx: 'AllExceptionsFilter' }),

  // 파일 업로드 실패 (10)
  ...Array(10).fill({ method: 'POST', path: '/api/post', msg: 'Error: S3 upload failed: RequestTimeout — connection timed out', ctx: 'AllExceptionsFilter' }),
];

// warn 시나리오
const WARN_SCENARIOS = [
  ...Array(20).fill({ ctx: 'AuthService', extra: () => ({ status: randomFrom([400, 401, 403]) }), msg: () => `Google token exchange failed` }),
  ...Array(15).fill({ ctx: 'AuthService', extra: () => ({ status: randomFrom([400, 401]) }), msg: () => `Spotify exchange failed` }),
  ...Array(15).fill({ ctx: 'TrendingStreamConsumer', extra: () => ({ queueDepth: randomInt(500, 5000), lagMs: randomInt(200, 2000) }), msg: () => 'Event processing delayed' }),
];

// service error 시나리오
const SERVICE_ERROR_SCENARIOS = [
  ...Array(10).fill({ ctx: 'AlgorithmStreamConsumer', msg: 'Consumer group creation failed: BUSYGROUP Consumer Group name already exists', errorClass: 'Error' }),
  ...Array(10).fill({ ctx: 'AlgorithmStreamConsumer', msg: () => `Batch processing error on batch size ${randomInt(10, 100)}: Neo4j connection refused`, errorClass: 'Error' }),
  ...Array(10).fill({ ctx: 'TrendingStreamConsumer', msg: () => `Stream processing failed for eventId ${randomUUID()}: WRONGTYPE Operation against a key holding the wrong kind of value`, errorClass: 'Error' }),
];

// --- shuffle ---

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 단일 로그 이벤트 출력 (시나리오 풀에서 가중치 기반으로 랜덤 선택)
const CONTINUOUS_POOL = [
  ...Array(82).fill('api'),
  ...Array(10).fill('error'),
  ...Array(5).fill('warn'),
  ...Array(3).fill('serviceError'),
];

function emitOne() {
  const type = randomFrom(CONTINUOUS_POOL);
  const t = Date.now();

  if (type === 'api') {
    const s = randomFrom(API_SCENARIOS);
    const url = typeof s.path === 'function' ? s.path() : s.path;
    emitApiLog(s.method, url, randomLatency(s.lat), userId(s.auth), t);

  } else if (type === 'error') {
    const s = randomFrom(ERROR_SCENARIOS);
    const url = typeof s.path === 'function' ? s.path() : s.path;
    const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
    emitHttpErrorLog(s.method, url, msg, fakeStack('InternalServerErrorException', msg), t);

  } else if (type === 'warn') {
    const s = randomFrom(WARN_SCENARIOS);
    const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
    const extra = typeof s.extra === 'function' ? s.extra() : {};
    emitWarnLog(s.ctx, extra, msg, t);

  } else {
    const s = randomFrom(SERVICE_ERROR_SCENARIOS);
    const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
    emitServiceErrorLog(s.ctx, msg, fakeStack(s.errorClass, msg), t);
  }
}

// --- main ---

function main() {
  const normalLogs = shuffle(API_SCENARIOS).map((s) => ({ type: 'api', scenario: s }));
  const errorLogs = shuffle(ERROR_SCENARIOS).map((s) => ({ type: 'error', scenario: s }));
  const warnLogs = shuffle(WARN_SCENARIOS).map((s) => ({ type: 'warn', scenario: s }));
  const serviceErrorLogs = shuffle(SERVICE_ERROR_SCENARIOS).map((s) => ({ type: 'serviceError', scenario: s }));

  const all = shuffle([...normalLogs, ...errorLogs, ...warnLogs, ...serviceErrorLogs]);

  for (const item of all) {
    const t = ts();
    const { type, scenario: s } = item;

    if (type === 'api') {
      const url = typeof s.path === 'function' ? s.path() : s.path;
      emitApiLog(s.method, url, randomLatency(s.lat), userId(s.auth), t);

    } else if (type === 'error') {
      const url = typeof s.path === 'function' ? s.path() : s.path;
      const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
      emitHttpErrorLog(s.method, url, msg, fakeStack('InternalServerErrorException', msg), t);

    } else if (type === 'warn') {
      const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
      const extra = typeof s.extra === 'function' ? s.extra() : {};
      emitWarnLog(s.ctx, extra, msg, t);

    } else if (type === 'serviceError') {
      const msg = typeof s.msg === 'function' ? s.msg() : s.msg;
      emitServiceErrorLog(s.ctx, msg, fakeStack(s.errorClass, msg), t);
    }
  }

  // 1000개 이후 주기적으로 랜덤 로그 출력
  function scheduleNext() {
    setTimeout(() => {
      const count = randomInt(1, 5);
      for (let i = 0; i < count; i++) emitOne();
      scheduleNext();
    }, randomInt(500, 3000));
  }

  scheduleNext();
}

main();
