# Vibr API 문서

## 개요

- **Base URL (Production)**: `https://vibr.site/api`
- **Base URL (Local)**: `http://localhost:3002/api`
- **전역 Prefix**: `/api`
- **인증 방식**: JWT (쿠키 `jwt` 또는 `Authorization: Bearer <token>`)

### 인증 레벨

| 레벨 | 설명 |
|------|------|
| `Required` | `AuthGuard` — 유효한 JWT 필수, 없으면 401 |
| `Optional` | `AuthOptionalGuard` — JWT 있으면 로그인 상태, 없어도 허용 |
| `None` | 인증 불필요 |

### 공통 응답 형식

페이지네이션이 있는 목록 API는 커서 기반 페이지네이션을 사용합니다.

```json
{
  "items": [...],
  "hasNext": true,
  "nextCursor": "..."
}
```

---

## 인증 — `/auth`

### `GET /auth/check`

헬스체크.

**인증**: None

**응답 `200`**
```json
{ "status": "ok" }
```

---

### `POST /auth/login/tmp` _(DEV 전용)_

임시 유저 ID로 JWT를 발급합니다. Production 환경에서는 404를 반환합니다.

**인증**: None

**요청 Body**
```json
{ "id": "user-id" }
```

**응답 `200`**
```json
{ "appJwt": "<JWT 토큰>" }
```

---

### `POST /auth/logout`

쿠키의 JWT를 삭제합니다.

**인증**: None

**응답 `200`**
```json
{ "ok": true }
```

---

### `POST /auth/spotify/exchange`

Spotify OAuth 인가 코드를 Spotify 액세스 토큰으로 교환합니다.

**인증**: None

**요청 Body**
```json
{
  "code": "spotify-auth-code",
  "verifier": "pkce-code-verifier"
}
```

**응답 `200`**
```json
{
  "spotifyAccessToken": "...",
  "spotifyTokenExpiresIn": 3600
}
```

---

### `POST /auth/google/exchange`

Google OAuth 인가 코드를 앱 JWT로 교환합니다. 신규 유저는 자동 가입됩니다.

**인증**: None

**요청 Body**
```json
{
  "code": "google-auth-code",
  "verifier": "pkce-code-verifier (optional)"
}
```

**응답 `200`**
```json
{ "appJwt": "<JWT 토큰>" }
```

---

## 유저 — `/user`

### `GET /user/me`

현재 로그인한 유저의 프로필을 조회합니다.

**인증**: Required

**응답 `200`**
```json
{
  "id": "uuid",
  "nickname": "string",
  "profileImgUrl": "https://... | null"
}
```

---

### `GET /user/search`

닉네임으로 유저를 검색합니다.

**인증**: Optional

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `q` | string | Y | 검색 키워드 |
| `limit` | number | N | 최대 결과 수 (기본값: 10) |
| `cursor` | string | N | 페이지네이션 커서 |

**응답 `200`**
```json
{
  "users": [
    {
      "id": "uuid",
      "nickname": "string",
      "profileImgUrl": "https://... | null",
      "isFollowing": false
    }
  ],
  "hasNext": true,
  "nextCursor": "..."
}
```

---

### `GET /user/:userId`

특정 유저의 프로필을 조회합니다.

**인증**: Optional

**Path Parameters**

| 파라미터 | 설명 |
|---------|------|
| `userId` | 조회할 유저 ID |

**응답 `200`**
```json
{
  "id": "uuid",
  "nickname": "string",
  "profileImgUrl": "https://... | null",
  "bio": "string",
  "followerCount": 0,
  "followingCount": 0,
  "isFollowing": false
}
```

---

### `PATCH /user`

현재 로그인한 유저의 프로필을 수정합니다.

**인증**: Required

**요청 Body**
```json
{
  "nickname": "string (2~12자)",
  "bio": "string (최대 255자)"
}
```

**응답 `200`**: 업데이트된 유저 정보

---

## 포스트 — `/post`

### `POST /post`

새 포스트를 작성합니다. `multipart/form-data` 형식입니다.

**인증**: Required

**요청 (multipart/form-data)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `coverImgUrl` | File | N | 커버 이미지 파일 |
| `content` | string | N | 포스트 텍스트 |
| `musics` | string (JSON) | Y | `MusicRequestDto[]` 배열을 JSON 직렬화한 문자열 |

**`MusicRequestDto` 구조**
```json
{
  "id": "uuid (optional, 기존 음악 참조 시)",
  "trackUri": "spotify:track:...",
  "provider": "spotify | apple | itunes | youtube",
  "albumCoverUrl": "https://...",
  "title": "곡 제목",
  "artistName": "아티스트명",
  "durationMs": 210000
}
```

**응답 `201`**
```json
{ "ok": true }
```

---

### `GET /post/:id`

포스트 상세 정보를 조회합니다.

**인증**: Optional

**응답 `200`**
```json
{
  "id": "uuid",
  "author": {
    "id": "uuid",
    "nickname": "string",
    "profileImgUrl": "https://... | null"
  },
  "coverImgUrl": "https://...",
  "musics": [
    {
      "id": "uuid",
      "trackUri": "string",
      "provider": "spotify",
      "albumCoverUrl": "https://...",
      "title": "string",
      "artistName": "string",
      "durationMs": 210000
    }
  ],
  "content": "string",
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "isEdited": false,
  "isLiked": false
}
```

---

### `PATCH /post/:id`

포스트 내용을 수정합니다. 작성자 본인만 가능합니다.

**인증**: Required

**요청 Body**
```json
{ "content": "수정할 내용" }
```

**응답 `200`**
```json
{ "ok": true }
```

---

### `DELETE /post/:id`

포스트를 삭제합니다. 작성자 본인만 가능합니다.

**인증**: Required

**응답 `200`**
```json
{ "ok": true }
```

---

### `GET /post/user/:userId`

특정 유저가 작성한 포스트 목록을 조회합니다.

**인증**: None

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `limit` | number | N | 최대 결과 수 (기본값: 10) |
| `cursor` | string | N | 페이지네이션 커서 |

**응답 `200`**
```json
{
  "posts": [
    {
      "postId": "uuid",
      "coverImgUrl": "https://...",
      "likeCount": 0,
      "commentCount": 0,
      "isMoreThanOneMusic": false
    }
  ],
  "hasNext": true,
  "nextCursor": "..."
}
```

---

## 음악 — `/music`

### `POST /music`

음악 정보를 등록합니다. 중복 `trackUri`가 있으면 기존 항목을 반환합니다.

**인증**: None

**요청 Body**
```json
{
  "trackUri": "spotify:track:...",
  "provider": "spotify | apple | itunes | youtube",
  "albumCoverUrl": "https://...",
  "title": "곡 제목",
  "artistName": "아티스트명",
  "durationMs": 210000
}
```

**응답 `201`**
```json
{
  "id": "uuid",
  "trackUri": "string",
  "provider": "spotify",
  "albumCoverUrl": "https://...",
  "title": "string",
  "artistName": "string",
  "durationMs": 210000
}
```

---

## 댓글 — `/comment`

### `POST /comment`

댓글을 작성합니다.

**인증**: Required

**요청 Body**
```json
{
  "postId": "uuid",
  "content": "댓글 내용 (최대 2300자)"
}
```

**응답 `201`**
```json
{
  "message": "댓글이 생성되었습니다.",
  "id": "uuid"
}
```

---

### `GET /comment`

포스트의 댓글 목록을 조회합니다.

**인증**: None

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `postId` | string (UUID) | Y | 포스트 ID |

**응답 `200`**
```json
{
  "comments": [
    {
      "id": "uuid",
      "content": "string",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "author": {
        "id": "uuid",
        "nickname": "string",
        "profileImgUrl": "https://... | null"
      }
    }
  ]
}
```

---

### `PATCH /comment/:commentId`

댓글을 수정합니다. 작성자 본인만 가능합니다.

**인증**: Required

**요청 Body**
```json
{ "content": "수정할 내용 (최대 2300자)" }
```

**응답 `200`**
```json
{ "message": "댓글이 수정되었습니다." }
```

---

### `DELETE /comment/:commentId`

댓글을 삭제합니다. 작성자 본인만 가능합니다.

**인증**: Required

**응답 `200`**
```json
{ "message": "댓글이 삭제되었습니다." }
```

---

## 좋아요 — `/like`

### `POST /like`

포스트에 좋아요를 추가합니다.

**인증**: Required

**요청 Body**
```json
{ "postId": "uuid" }
```

**응답 `201`**: 좋아요 생성 결과

---

### `DELETE /like/:postId`

포스트의 좋아요를 취소합니다.

**인증**: Required

**응답 `200`**: 좋아요 삭제 결과

---

### `GET /like/:postId/users`

포스트에 좋아요를 누른 유저 목록을 조회합니다.

**인증**: None

**응답 `200`**
```json
[
  {
    "id": "uuid",
    "nickname": "string",
    "profileImgUrl": "https://... | null"
  }
]
```

---

## 팔로우 — `/follow`

### `POST /follow`

유저를 팔로우합니다.

**인증**: Required

**요청 Body**
```json
{ "otherUserId": "uuid" }
```

**응답 `201`**: 팔로우 생성 결과

---

### `DELETE /follow`

유저를 언팔로우합니다.

**인증**: Required

**요청 Body**
```json
{ "otherUserId": "uuid" }
```

**응답 `204`**: 응답 본문 없음

---

### `GET /follow/following/:userId`

특정 유저가 팔로우하는 목록을 조회합니다.

**인증**: Optional

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `limit` | number | N | 최대 결과 수 (기본값: 10) |
| `cursor` | string | N | 페이지네이션 커서 |

**응답 `200`**
```json
{
  "users": [
    {
      "id": "uuid",
      "nickname": "string",
      "profileImgUrl": "https://... | null",
      "isFollowing": false
    }
  ],
  "hasNext": true,
  "nextCursor": "..."
}
```

---

### `GET /follow/follower/:userId`

특정 유저의 팔로워 목록을 조회합니다.

**인증**: Optional

응답 구조는 `GET /follow/following/:userId`와 동일합니다.

---

## 플레이리스트 — `/playlist`

> 모든 엔드포인트에 **Required** 인증이 필요합니다.

### `GET /playlist`

내 플레이리스트 전체 목록을 조회합니다.

**응답 `200`**
```json
{
  "playlists": [
    {
      "id": "uuid",
      "title": "string",
      "tracksCount": 5,
      "firstAlbumCoverUrl": "https://..."
    }
  ]
}
```

---

### `POST /playlist`

새 플레이리스트를 생성합니다.

**요청 Body**
```json
{ "title": "플레이리스트 제목 (1~20자, optional)" }
```

**응답 `201`**
```json
{
  "id": "uuid",
  "title": "string"
}
```

---

### `GET /playlist/:id`

플레이리스트 상세 정보 및 트랙 목록을 조회합니다.

**응답 `200`**
```json
{
  "id": "uuid",
  "title": "string",
  "musics": [
    {
      "id": "uuid",
      "trackUri": "string",
      "provider": "spotify",
      "albumCoverUrl": "https://...",
      "title": "string",
      "artistName": "string",
      "durationMs": 210000
    }
  ]
}
```

---

### `PATCH /playlist/:id`

플레이리스트 제목을 수정합니다.

**요청 Body**
```json
{ "title": "새 제목 (1~20자)" }
```

**응답 `200`**
```json
{
  "id": "uuid",
  "title": "string"
}
```

---

### `DELETE /playlist/:id`

플레이리스트를 삭제합니다.

**응답 `200`**
```json
{ "ok": true }
```

---

### `POST /playlist/:id/music`

플레이리스트에 음악을 추가합니다.

**요청 Body**
```json
{
  "musics": [
    {
      "id": "uuid (optional)",
      "trackUri": "string",
      "provider": "spotify",
      "albumCoverUrl": "https://...",
      "title": "string",
      "artistName": "string",
      "durationMs": 210000
    }
  ]
}
```

**응답 `201`**
```json
{
  "addedMusics": [
    {
      "id": "uuid",
      "trackUri": "string",
      "provider": "spotify",
      "albumCoverUrl": "https://...",
      "title": "string",
      "artistName": "string",
      "durationMs": 210000
    }
  ]
}
```

---

### `PUT /playlist/:id/music`

플레이리스트 내 음악 순서를 변경합니다.

**요청 Body**
```json
{ "musicIds": ["uuid", "uuid", "uuid"] }
```

**응답 `200`**
```json
{ "ok": true }
```

---

## 피드 — `/feed`

### `GET /feed`

홈 피드를 조회합니다. 팔로잉 피드 / 트렌딩 피드 / 최신 피드를 혼합하여 반환합니다.

**인증**: Optional

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `limit` | number | N | 한 번에 가져올 포스트 수 (기본값: 10) |
| `followingCursor` | string (UUIDv7) | N | 팔로잉 피드 커서 |
| `trendingCursor` | string | N | 트렌딩 피드 커서 |
| `recentCursor` | string (UUIDv7) | N | 최신 피드 커서 |

**응답 `200`**
```json
{
  "posts": [ /* PostResponseDto[] */ ],
  "hasNext": true,
  "nextCursor": {
    "following": "uuid",
    "trending": "string",
    "recent": "uuid"
  }
}
```

---

## 알림 — `/noti`

### `GET /noti`

내 알림 목록을 조회합니다.

**인증**: Required

**응답 `200`**
```json
[
  {
    "id": "uuid",
    "actor": {
      "id": "uuid",
      "nickname": "string",
      "profileImgUrl": "https://... | null"
    },
    "type": "follow | like | comment",
    "relatedId": "uuid",
    "relatedType": "post | user",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "thumbnailUrl": "https://... | null",
    "thumbnailShape": "circle | square"
  }
]
```

---

### `PATCH /noti/:id`

알림을 읽음 처리합니다.

**인증**: Required

**응답 `200`**
```json
{ "ok": true }
```

---

### `DELETE /noti/:id`

알림을 삭제합니다.

**인증**: Required

**응답 `200`**
```json
{ "ok": true }
```

---

## 현재 재생목록 — `/nowPlaylist`

### `PUT /nowPlaylist`

현재 재생 중인 음악 목록을 저장합니다. 기존 목록을 덮어씁니다.

**인증**: Required

**요청 Body**
```json
{ "musicIds": ["uuid", "uuid"] }
```

**응답 `200`**
```json
{
  "message": "재생목록이 저장되었습니다.",
  "count": 2
}
```

---

### `GET /nowPlaylist`

저장된 현재 재생목록을 조회합니다.

**인증**: Required

**응답 `200`**
```json
{
  "musics": [
    {
      "id": "uuid",
      "trackUri": "string",
      "provider": "spotify",
      "albumCoverUrl": "https://...",
      "title": "string",
      "artistName": "string",
      "durationMs": 210000
    }
  ]
}
```

---

## 개인정보 동의 — `/privacy`

> 모든 엔드포인트에 **Required** 인증이 필요합니다.

### `POST /privacy/consent`

회원가입 시 약관 동의를 기록합니다.

**응답 `201`**
```json
{ "success": true }
```

---

### `POST /privacy`

약관 동의 상태를 업데이트합니다.

**요청 Body**
```json
{
  "items": [
    { "type": "TERMS | PRIVACY", "agreed": true }
  ]
}
```

**응답 `201`**
```json
{ "success": true }
```

---

### `GET /privacy`

가장 최근 약관 동의 내역을 조회합니다.

**응답 `200`**
```json
{
  "items": [
    { "type": "TERMS | PRIVACY", "agreed": true }
  ]
}
```

---

## 로그 수집 — `/logs`

### `POST /logs`

클라이언트 및 서버 이벤트 로그를 배치로 수집합니다.

**인증**: Required

**요청 Body**
```json
{
  "events": [
    {
      "eventType": "string (최대 50자)",
      "source": "fe_api | fe_ux | be",
      "occurredAt": "2024-01-01T00:00:00.000Z (optional, ISO8601)",
      "sessionId": "string (optional, 최대 64자)",
      "method": "GET (optional, 최대 8자)",
      "path": "/api/... (optional, 최대 255자)",
      "statusCode": 200,
      "durationMs": 150,
      "targetPostId": "uuid (optional)",
      "targetUserId": "uuid (optional)",
      "provider": "spotify (optional)",
      "meta": {}
    }
  ]
}
```

**응답 `201`**
```json
{
  "ok": true,
  "accepted": 3
}
```

---

## 공통 에러 응답

| HTTP 상태 | 설명 |
|-----------|------|
| `400 Bad Request` | 요청 파라미터 또는 Body 유효성 검사 실패 |
| `401 Unauthorized` | JWT 없음 또는 유효하지 않음 |
| `403 Forbidden` | 권한 없음 (타인의 리소스 수정 시도 등) |
| `404 Not Found` | 리소스를 찾을 수 없음 |
| `500 Internal Server Error` | 서버 내부 오류 |
