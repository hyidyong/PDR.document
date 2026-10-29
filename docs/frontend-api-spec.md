# 프론트엔드 API 명세 (로그인 · 담당자 화면)

A 계정(로그인)과 D 담당자 화면이 지금 목업으로 쓰는 데이터 형식을 API 명세로 정리한 문서입니다. 백엔드에서 아래 형식대로 응답해 주면, 프론트는 `src/api/authApi.ts`와 `src/api/adminApi.ts`의 함수 안만 `fetch` 호출로 바꾸면 됩니다. 화면 코드는 고치지 않아도 됩니다.

- **주소:** 이미 있는 백엔드 API(`backend/README.md`)와 맞춰 `/api/projects/{projectId}` 아래에 두었습니다. 시연 프로젝트 ID는 `modit-2026`입니다.
- **확정 여부:** 주소는 제안입니다. 바꿔야 하면 알려주세요. 요청·응답 형식은 지금 프론트가 실제로 쓰는 형식입니다.
- **예시 데이터:** 모두 시연용 목업입니다. 이메일은 `example.com`을 씁니다.

## 1. 공통

| 항목 | 내용 |
|---|---|
| 형식 | 요청·응답 모두 JSON (`Content-Type: application/json`). ZIP 다운로드만 예외 |
| 인증 | 로그인 후 받은 토큰을 `Authorization: Bearer {token}` 헤더로 보냄. 프론트는 토큰을 `src/store/sessionStore.ts` 한 곳에만 저장함 |
| 시각 | 지금 목업은 `"2026-10-28T15:20"`(한국 시각, 초·시간대 없음) 형식. 서버는 `"2026-10-28T15:20:00+09:00"`처럼 시간대를 붙여 줘도 됨. 프론트에서 맞춰 읽음 |
| 오류 응답 | `{ "code": "INVALID_CREDENTIALS", "message": "이메일 또는 비밀번호가 맞지 않아요" }`. `message`는 화면에 그대로 보여줄 수 있는 한국어 문장 |

### 제출 상태

| 화면 | 값 |
|---|---|
| 미제출 | `DRAFT` |
| 제출 | `SUBMITTED` |
| 제출(미비) | `SUBMITTED_INCOMPLETE` |
| 보완 필요 | `NEEDS_REVISION` |
| 재제출 | `REVIEW_PENDING` |
| 승인 | `APPROVED` |

> **백엔드와 다른 점:** 지금 백엔드는 제출 상태(`SubmissionStatus`, `APPROVED` 없음)와 승인 상태(`ApprovalStatus`: `PENDING`/`APPROVED`/`REJECTED`)를 따로 둡니다. 프론트는 하나의 `status`만 씁니다. 아래 둘 중 하나로 맞추면 됩니다.
> - 서버가 합친 값을 내려줌: 승인 상태가 `APPROVED`이면 `status: "APPROVED"`, 아니면 제출 상태를 그대로 넣음
> - 서버는 둘 다 내려주고, 프론트 `adminApi.ts`에서 같은 규칙으로 합침

## 2. 로그인 (`src/api/authApi.ts`)

### 로그인 — `login(email, password)`

`POST /api/auth/login`

요청
```json
{ "email": "admin@example.com", "password": "demo1234" }
```

응답 `200`
```json
{
  "token": "demo-reviewer-001-1761700000000",
  "user": {
    "id": "reviewer-001",
    "name": "박담당",
    "email": "admin@example.com",
    "role": "REVIEWER",
    "organization": "한국대학교 창업지원단"
  }
}
```

- `role`은 `APPLICANT`(신청자) 또는 `REVIEWER`(담당자)입니다. 백엔드의 개발용 헤더 `X-Dev-Role: REVIEWER`와 같은 이름을 씁니다.
- 프론트는 `role`을 보고 이동합니다. `APPLICANT`는 신청자 화면(B1), `REVIEWER`는 담당자 화면(D5)으로 갑니다.

오류

| 상태 | code | 프론트 표시 위치 | 예시 message |
|---|---|---|---|
| 400 | `INVALID_EMAIL` | 이메일 칸 아래 | 이메일 형식이 맞지 않아요 |
| 400 | `PASSWORD_REQUIRED` | 비밀번호 칸 아래 | 비밀번호를 입력해 주세요 |
| 401 | `INVALID_CREDENTIALS` | 비밀번호 칸 아래 | 이메일 또는 비밀번호가 맞지 않아요 |

- 그 밖의 오류가 오면 프론트는 "로그인하지 못했어요. 잠시 후 다시 시도해 주세요"를 띄웁니다.
- 지금은 이메일 빈칸·형식 검사도 목업 `login()` 함수 안에서 합니다. API로 바꾸면 이 함수 내용이 통째로 바뀌므로, 같은 검사를 서버에서 해 주세요.

데모 계정(목업): 비밀번호는 두 계정 모두 `demo1234`입니다.

| 이메일 | 역할 | 이름 |
|---|---|---|
| `applicant@example.com` | `APPLICANT` | 김청년 |
| `admin@example.com` | `REVIEWER` | 박담당 |

### 로그아웃 — `logout()`

`POST /api/auth/logout` (Authorization 헤더 필요) → `204`

- 서버 응답과 관계없이 프론트는 저장한 토큰을 지우고 로그인 화면으로 돌아갑니다.

### (제안) 내 정보 — 아직 프론트에서 부르지 않음

`GET /api/auth/me` → `200 { user }` / `401`

- "로그인 상태 유지"로 저장해 둔 토큰은, 지금은 새로고침할 때 확인 없이 그대로 씁니다.
- 이 API가 생기면 새로고침 때 토큰이 아직 유효한지 확인하는 데 쓰겠습니다.

## 3. 담당자 화면 (`src/api/adminApi.ts`)

기본 경로: `/api/projects/{projectId}/review`. 모두 Authorization 헤더가 필요하고, `REVIEWER` 역할만 쓸 수 있습니다.

### 공통 형식

**신청자 `AdminApplicant`**
```json
{
  "applicantId": "A001",
  "name": "김청년",
  "studentId": "20231234",
  "status": "SUBMITTED_INCOMPLETE",
  "aiSummary": { "error": 1, "review": 1 },
  "lastSubmittedAt": "2026-10-28T15:20"
}
```
- `aiSummary`: 마지막 AI 점검의 오류 수와 확인 필요 수
- `lastSubmittedAt`: 마지막으로 제출하거나 재제출한 시각. 미제출이면 `null`
- 신청자 ID: 목업은 `A001`~`A030`, 백엔드는 `applicant-001` 형식입니다. 백엔드 형식으로 바꿔도 프론트에는 문제가 없습니다.

**진행 이력 `AdminEvent`**
```json
{ "kind": "revision", "at": "2026-10-29T11:30", "label": "보완 요청", "tone": "error", "comment": "매수인 서명·날인이 빠져 있어요.", "attachAi": true }
```

| kind | 뜻 | 목업 label | 목업 tone |
|---|---|---|---|
| `link` | 제출 링크 공유 | 제출 링크 공유 | `muted` |
| `ai` | AI 점검 | AI 점검 2회차 · 오류 1, 확인 1 | `muted` |
| `submit` | 제출 / 제출(미비) | 제출 · 제출(미비) | `navy` · `error` |
| `revision` | 보완 요청 | 보완 요청 | `error` |
| `resubmit` | 재제출 | 재제출 | `brand` |
| `approved` | 승인 | 승인 완료 | `navy` |
| `approval-cancelled` | 승인 취소 | 승인 취소 | `muted` |

- `comment`, `attachAi`는 `revision`일 때만 들어갑니다. `attachAi`는 "AI 검사 결과도 함께 보내기"를 체크했는지 여부입니다.
- `label`과 `tone`은 화면용 값입니다. 서버는 `kind`·`at`·`comment`·`attachAi`만 보내도 됩니다. 그러면 `adminApi.ts`에서 위 표대로 `label`·`tone`을 채우겠습니다.

**변경 결과 `AdminChange`**: 상태를 바꾸는 API는 모두 이 형식으로 응답합니다.
```json
{ "applicant": { "...": "바뀐 AdminApplicant" }, "events": [ "...바뀐 뒤 전체 진행 이력 AdminEvent[]" ] }
```

### API 목록

| 프론트 함수 | 메서드 · 경로 | 요청 | 응답 `200` |
|---|---|---|---|
| `getProject()` | `GET /api/projects/{projectId}` (이미 있음) | — | 아래 "프로젝트" 참고 |
| `getApplicants()` | `GET /review/applicants` | — | `AdminApplicant[]` |
| `getApplicant(id)` | `GET /review/applicants/{applicantId}` | — | `AdminApplicant` (없으면 `404`) |
| `getEvents(id)` | `GET /review/applicants/{applicantId}/events` | — | `AdminEvent[]` (시간순) |
| `getAllEvents()` | `GET /review/events` | — | `{ "A001": AdminEvent[], ... }` |
| `getApplicantDocuments(id)` | `GET /review/applicants/{applicantId}/documents` | — | 아래 "서류·AI 결과" 참고 |
| `requestRevision(id, input)` | `POST /review/applicants/{applicantId}/revision-requests` | `{ "comment": "...", "attachAi": true }` | `AdminChange` |
| `approve(id)` | `POST /review/applicants/{applicantId}/approval` | — | `AdminChange` |
| `cancelApproval(id)` | `DELETE /review/applicants/{applicantId}/approval` | — | `AdminChange` |
| `downloadDocumentsZip(ids)` | `POST /review/downloads/zip` | `{ "applicantIds": ["A001", "A002"] }` | ZIP 파일 |

**프로젝트**: 지금 목업 형식입니다. 백엔드는 지금 `{ id, name }`만 줍니다.
```json
{
  "name": "2026 창업동아리 지원사업 정산",
  "deadlineBadge": "마감 10월 31일 · D-3",
  "linkSharedAt": "2026-10-24T09:10",
  "zipFileName": "2026_창업동아리_정산.zip"
}
```
- `deadlineBadge`는 화면용 문구입니다. 서버가 마감일 `deadline: "2026-10-31"`만 주면, 프론트에서 "D-3" 문구를 만들겠습니다.

**서류·AI 결과**
```json
{
  "clubName": "스타트온",
  "issues": [
    { "number": 1, "kind": "error", "title": "매수인 서명·날인 누락", "location": "물품매매계약서 1페이지 하단 매수인 칸", "document": "물품매매계약서", "target": "signature" },
    { "number": 2, "kind": "review", "title": "계약 금액 1,350,000원 ↔ 영수증 합계 1,320,000원 불일치", "location": "물품매매계약서 · 영수증 첨부철 비교", "document": "영수증 첨부철", "target": "amount" }
  ]
}
```
- `kind`: `error`(오류) 또는 `review`(확인 필요)
- `document`: 서류 이름. 백엔드 서류 ID와 이렇게 대응합니다.

  | 서류 이름 | 백엔드 서류 ID |
  |---|---|
  | 사업계획서 | `plan` |
  | 물품매매계약서 | `contract` |
  | 영수증 첨부철 | `receipts` |

  서버는 ID로 보내도 됩니다. 프론트에서 이름으로 바꾸겠습니다.
- `target`: 미리보기에서 표시할 위치입니다. 지금은 `signature`, `amount`, `null`만 씁니다.
- 실제 파일 미리보기 주소는 아직 쓰지 않습니다. 붙일 때는 기존 `.../documents/{requirementId}/versions/{version}/file`을 쓰면 됩니다.

### 동작 규칙

- **보완 요청:**
  - 상태를 `NEEDS_REVISION`으로 바꾸고, 진행 이력에 `revision`을 남깁니다.
  - `comment`는 1~500자입니다. 비었거나 넘치면 `400`입니다.
  - 기존 개발용 API(`POST /api/dev/.../feedback`)는 `targetRequirementIds`를 받지만, 지금 화면에는 보완할 서류를 고르는 칸이 없습니다. 서버에서 AI 결과로 대상을 정하거나, 나중에 화면에 선택 칸을 추가해야 합니다.
- **승인:**
  - 상태를 `APPROVED`로 바꾸고, 진행 이력에 `approved`를 남깁니다.
  - 이미 승인된 신청자에게 다시 요청하면, 아무것도 바꾸지 않고 현재 값을 돌려주세요.
- **승인 취소:**
  - 승인 전 상태로 되돌리고, 진행 이력에 `approval-cancelled`를 남깁니다.
  - 백엔드처럼 승인 상태를 따로 두는 구조라면, 승인 상태만 `PENDING`으로 돌리면 됩니다.
  - 승인되지 않은 신청자에게 요청하면 현재 값을 그대로 돌려주세요.
- **ZIP 다운로드:**
  - 응답은 `200`, `Content-Type: application/zip`, `Content-Disposition: attachment; filename="2026_창업동아리_정산.zip"`입니다.
  - 압축 안의 폴더 구조는 `{applicantId}_{이름}/사업계획서.pdf`, `물품매매계약서.pdf`, `영수증첨부철.pdf`입니다.
  - 미제출 신청자는 프론트에서 미리 빼고 보냅니다.
  - 지금 목업은 파일 없이 `{ "downloaded": false }`를 돌려주고, 화면은 "데모에서는 다운로드되지 않아요"를 띄웁니다.
- **없는 신청자:** 없는 `applicantId`로 요청하면 `404` `{ "code": "APPLICANT_NOT_FOUND", "message": "신청자를 찾을 수 없어요" }`입니다.

## 4. 서버가 필요 없는 것

- `resetDemo()`와 `/admin?reset=1`은 브라우저에 저장한 시연 데이터만 처음 상태로 되돌립니다. API로 만들 필요가 없습니다.
- 회원가입(A2)과 비밀번호 찾기는 아직 화면에 "준비 중" 안내만 있습니다. API가 생기면 이 문서에 추가하겠습니다.
