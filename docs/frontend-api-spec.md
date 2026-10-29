# 프론트엔드 API 명세 (로그인 · 역할 선택 · 담당자 화면)

A 계정(로그인)과 D 담당자 화면이 쓰는 데이터 형식을 API 명세로 정리한 문서입니다.

- **로그인 · 역할 선택:** Supabase와 백엔드에 연결되어 있습니다(2장).
- **담당자 화면(D1~D11):** 아직 데모용 Mock입니다(3장). 데이터는 브라우저(localStorage)에만 저장됩니다. 백엔드에서 3장 형식대로 응답해 주면, 프론트는 `src/api/adminApi.ts`의 함수 안만 `src/api.ts`의 `request()` 방식 호출로 바꾸면 됩니다. 화면 코드는 고치지 않아도 됩니다.

- **주소:** 이미 있는 백엔드 API(`backend/README.md`)와 맞춰 `/api/projects/{projectId}` 아래에 두었습니다. 시연 프로젝트 ID는 `modit-2026`입니다.
- **확정 여부:** 주소는 제안입니다. 바꿔야 하면 알려주세요. 요청·응답 형식은 지금 프론트가 실제로 쓰는 형식입니다.
- **예시 데이터:** 모두 시연용 목업입니다. 이메일은 `example.com`을 씁니다.

## 1. 공통

| 항목 | 내용 |
|---|---|
| 형식 | 요청·응답 모두 JSON (`Content-Type: application/json`). ZIP 다운로드만 예외 |
| 인증 | Supabase 로그인 토큰(`access_token`)을 `Authorization: Bearer {token}` 헤더로 보냄. 토큰은 Supabase 클라이언트(`src/supabase.ts`)가 저장하고, `src/api.ts`의 `request()`가 헤더에 붙임 |
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

## 2. 로그인과 역할 선택 (`src/api/authApi.ts`)

로그인할 때는 역할을 정하지 않습니다. 로그인한 뒤 A2 역할 선택 화면에서 고른 역할로 이동합니다.

```
A1 로그인 ── signIn() ──▶ A2 역할 선택 ─┬─ [서류를 받아요] ──▶ 담당자 D1 홈 (데모/Mock)
                                        └─ [서류를 내요] ── getCurrentApplicant() ──▶ 신청자 서류 점검
```

`authApi`는 `src/api.ts`의 `signIn()`, `getCurrentApplicant()`를 감싼 층입니다. 입력칸별 오류 문구, 화면에 보여줄 이름·이메일, 서버 연결 실패 처리만 덧붙입니다. 팀원 B1 화면이 쓰는 `signInAndResolveUser()`는 그대로 있습니다.

### 1단계: 로그인 — `login(email, password)`

1. **입력 검사(프론트):** 이메일이 비었거나 형식이 틀리면 이메일 칸 아래에, 비밀번호가 비었으면 비밀번호 칸 아래에 오류를 보여줍니다. 이때는 서버를 부르지 않습니다.
2. **Supabase 로그인:** `supabase.auth.signInWithPassword({ email, password })`
3. **프로젝트 조회:** `GET /api/projects/{projectId}`
   ```json
   { "id": "modit-2026", "name": "2026 창업동아리 지원사업 정산", "deadlineAt": "2026-10-31T23:59:59+09:00" }
   ```
4. **A2로 이동:** `deadlineAt`이 없거나 잘못된 값이면 프론트 기본값 `2026-10-31T23:59:59+09:00`을 씁니다.

`login()`이 돌려주는 값(`LoginOutcome`)
```json
{
  "project": { "id": "modit-2026", "name": "2026 창업동아리 지원사업 정산", "deadlineAt": "2026-10-31T23:59:59+09:00" },
  "user": { "name": "kim", "email": "kim@example.com" }
}
```
- `user.name`: Supabase `user_metadata.name`. 없으면 이메일 `@` 앞부분입니다. 신청자를 고르면 3번 응답의 `name`으로 바뀝니다.
- `user`는 `src/store/sessionStore.ts`에 저장해 A3 프로필 메뉴가 씁니다. 토큰은 Supabase가 따로 저장합니다.

### 2단계: 역할 선택(A2)

- **[서류를 받아요]:** 누구나 고를 수 있습니다(시연용). 서버를 부르지 않고 담당자 D1 홈으로 갑니다. 담당자 화면 데이터는 3장의 Mock입니다.
- **[서류를 내요]:** `chooseApplicant()`가 내 신청자 정보를 조회합니다.
  - `GET /api/projects/{projectId}/applicants/me`
    ```json
    { "id": "applicant-001", "projectId": "modit-2026", "name": "김청년" }
    ```
  - 성공하면 신청자 서류 점검 화면으로 갑니다.
  - `404`, 또는 계정 `app_metadata`에 `applicant_id`가 없어 `403`이면 "이 계정은 신청 정보가 없어요"를 보여주고 A2에 머뭅니다. 로그인은 유지되므로 [서류를 받아요]를 다시 고를 수 있습니다.
- 고른 역할은 `sessionStore`(화면 메모리)에만 저장합니다. Supabase에는 쓰지 않으며, 새로고침하면 A1부터 다시 시작합니다.
- 역할을 바꾸려면 브라우저 뒤로가기로 A2까지 돌아가거나 로그아웃합니다. 화면 이동은 `history.pushState`로 기록되며(`src/store/navHistory.ts`), 뒤로가기는 A2에서 멈추고 A1로는 가지 않습니다. 로그아웃한 뒤에는 남은 로그인 후 기록이 A1로 돌아갑니다.

### 오류

| 상황 | 표시 위치 | 문구 |
|---|---|---|
| 이메일 빈칸 · 형식 오류 | 이메일 칸 아래 | 이메일을 입력해 주세요 / 이메일 형식이 맞지 않아요 |
| 비밀번호 빈칸 | 비밀번호 칸 아래 | 비밀번호를 입력해 주세요 |
| Supabase 로그인 실패, 또는 서버가 `401` | 비밀번호 칸 아래 | 이메일 또는 비밀번호를 확인해 주세요 (401이면 서버 `message`) |
| 백엔드 연결 실패: 응답 없음, `5xx`(개발 프록시는 `502`), 10초 넘게 무응답 | 버튼 위 안내 | 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요 |
| 신청 정보 없음(`404`·`403`) | A2 버튼 위 안내 | 이 계정은 신청 정보가 없어요 |
| 그 밖의 서버 오류 | 버튼 위 안내 | 서버 응답의 `message` 그대로 |

- 1단계 프로젝트 조회가 실패하면 Supabase에서 로그아웃한 뒤 오류를 보여줍니다.
- 백엔드 연결 실패의 원래 오류는 브라우저 콘솔에 `[auth] 백엔드에 연결하지 못했어요`로 남습니다.
- 처리 중에는 버튼이 "로그인 중..." / "확인 중..."으로 바뀌고 다시 눌리지 않습니다.

### 로그아웃 — `logout()`

`supabase.auth.signOut()`. 별도 백엔드 API는 없습니다. 프론트는 저장한 사용자 정보를 지우고 A1로 돌아갑니다. A2의 [다른 계정으로 로그인]도 같은 동작입니다.

### 데모 버튼

- **[사용자 데모]:** `.env`의 `VITE_DEMO_APPLICANT_EMAIL`, `VITE_DEMO_APPLICANT_PASSWORD`로 `login()` → `chooseApplicant()`를 거쳐 A2 없이 신청자 서류 점검으로 바로 갑니다. 두 값 중 하나라도 비면 버튼이 보이지 않습니다. `VITE_` 값은 빌드 결과에 그대로 들어가므로 시연용 계정만 넣습니다.
- **[담당자 데모]:** 로그인 없이 담당자 화면을 Mock 데이터로 엽니다. 이때 `getProject()`는 `401`이 나므로 시연용 프로젝트 정보를 대신 씁니다.
- **"로그인 상태 유지" 체크박스:** 아직 연결되지 않았습니다. Supabase 클라이언트는 체크 여부와 관계없이 세션을 저장하지만(`persistSession: true`), 화면은 새로고침하면 항상 A1부터 시작합니다.

## 3. 담당자 화면 (`src/api/adminApi.ts`)

기본 경로: `/api/projects/{projectId}/review`. 모두 Authorization 헤더가 필요하고, `app_metadata.role`이 `"admin"`인 사용자만 쓸 수 있습니다. 아니면 `403`입니다.

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

**프로젝트**: `adminApi.getProject()`는 `src/api.ts`의 `getProject()`(`ProjectView`)를 그대로 부릅니다. 받은 값에 아직 서버에 없는 두 필드를 목업 값으로 더합니다.
```json
{
  "id": "modit-2026",
  "name": "2026 창업동아리 지원사업 정산",
  "deadlineAt": "2026-10-31T23:59:59+09:00",
  "linkSharedAt": "2026-10-24T09:10",
  "zipFileName": "2026_창업동아리_정산.zip"
}
```
- **마감 배지:** "마감 10월 31일 · D-3" 같은 문구는 `deadlineAt`으로 프론트가 만듭니다(`src/utils/projectDeadline.ts`).
- **서버에 추가하면 좋은 필드:** `linkSharedAt`(제출 링크 공유 시각, 진행 이력 첫 줄에 씀)와 `zipFileName`(ZIP 파일 이름)은 지금 목업 값입니다. 서버가 이 두 필드도 주면 그대로 씁니다.
- **실패할 때:** 로그인하지 않았거나(`401`) 서버에 연결되지 않으면 위 목업 값을 씁니다.

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

- `resetDemo()`와 `?reset=1`은 브라우저에 저장한 담당자 Mock 데이터만 처음 상태로 되돌립니다. `/?reset=1`로 연 뒤 [담당자 데모]를 누르거나, 로그인 → [서류를 받아요]로 담당자 화면에 들어가면 적용됩니다. API로 만들 필요가 없습니다. 신청자 제출 데이터는 백엔드 메모리에 있으므로 백엔드를 다시 켜야 초기화됩니다.
- 회원가입(A1 [회원가입] → A2)과 비밀번호 찾기는 아직 "준비 중" 안내만 있습니다. API가 생기면 이 문서에 추가하겠습니다.
- D1의 다른 두 프로젝트(교내 연구 활동비 정산, 해외봉사 활동 계획서)는 디자인 고정값입니다. 누르면 "준비 중" 안내만 뜹니다. D1 숫자 중 창업동아리 몫은 3장 Mock 상태에서 계산하므로 D7 보완 요청·D9 승인이 바로 반영됩니다.
