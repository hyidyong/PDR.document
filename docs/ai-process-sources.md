# AI 처리 과정과 출처

MODIT의 AI 서류 검수·체크리스트가 어떤 순서로 동작하고 무엇을 근거로 하는지 정리한 문서입니다. 저장소 코드를 **읽기만** 해서 작성했습니다(2026-10-30, 브랜치 `feature/admin-notify` 기준).

> **먼저 알아둘 점: 실제 AI 코드는 이 저장소에 없습니다.**
> `analyze-expense-hj`, `analyze-expense-hj-v2`, `generate-document-checklist`(Supabase 함수로 전달받은 이름)는 작업 폴더, 모든 원격 브랜치(`main`, `feature/admin-screens`, `feature/frontend-setup`), git 전체 기록 어디에도 없습니다. 팀원이 준 연동 자료 파일도 저장소와 이 PC의 해커톤·다운로드·문서 폴더에서 찾지 못했습니다.
> 그래서 아래 1장의 실제 AI 파이프라인은 **전달받은 설명**이고, 코드로 확인한 것은 2장의 Mock 동작뿐입니다. 확인되지 않은 칸은 모두 "AI 담당 확인 필요"로 남겼습니다.

## 1. 처리 과정

### 1-1. 서류 검수 (`analyze-expense-hj`, `-v2`)

| 단계 | 내용 | 근거 |
|---|---|---|
| 1 | 신청자가 서류 PDF 업로드 | 저장소 코드 확인 (2-1) |
| 2 | Azure OCR로 전체 페이지 텍스트 추출 | 전달받은 설명 · **AI 담당 확인 필요** (서비스 이름, 모델·API 버전, 페이지 수 제한) |
| 3 | OpenAI 보조 분석 | 전달받은 설명 · **AI 담당 확인 필요** (모델, 프롬프트, 입력이 PDF 원본인지 OCR 텍스트인지) |
| 4 | 검수 규칙 적용 (서명·날인 누락, 계약 금액 ↔ 영수증 합계 등) | 전달받은 설명 · **AI 담당 확인 필요** (규칙 목록과 위치) |
| 5 | findings 반환 → 화면에 오류·확인 필요 표시 | 반환 형식만 저장소 코드 확인 (2-1) |

`-hj`와 `-v2`의 차이: **AI 담당 확인 필요**

### 1-2. 체크리스트 생성 (`generate-document-checklist`)

| 단계 | 내용 | 근거 |
|---|---|---|
| 1 | 공고문에서 요구 서류·조건 추출 | 전달받은 설명 · **AI 담당 확인 필요** |
| 2 | 서류별 발급기관·발급 방법 웹 검색 | 전달받은 설명 · **AI 담당 확인 필요** (검색 도구·API, 검색 범위) |
| 3 | 출처 URL을 포함한 체크리스트 반환 | 전달받은 설명 · **AI 담당 확인 필요** (반환 형식, URL 검증 여부) |

## 2. 저장소 코드에서 확인한 것

### 2-1. 백엔드 검수 흐름 (Spring Boot)

| 단계 | 코드 | 동작 |
|---|---|---|
| 업로드 | `SubmissionService.upload` | 파일을 Storage(`expense-documents` 버킷, `SupabaseFileStorage`)에 저장하고 새 버전을 만든 뒤 바로 검사 |
| 크기 확인 | `SubmissionService.inspectLocked` | 4MB(`MAX_AI_BYTES`)를 넘으면 AI를 부르지 않고 `UNVERIFIABLE` + "4MB를 초과한 PDF는 AI 분석을 진행할 수 없습니다." |
| 분석 | `AiAnalysisService.analyze(requirementId, version)` | 구현은 **`MockAiAnalysisService` 하나뿐**. 파일 내용을 읽지 않고 서류 종류·버전으로 정해진 결과를 돌려줌 |
| 저장 | `modit_inspections` 테이블 (`001_modit_schema.sql`) | `status`(`PASS`·`RECOMMEND`·`UNVERIFIABLE`), `source`, `findings`(jsonb), `checked_at` |

Mock 결과 (`source: "MOCK"`):

| 서류 | 1회차 | 2회차 이상 |
|---|---|---|
| 사업계획서 (`plan`) | `PASS` | `PASS` |
| 물품매매계약서 (`contract`) | `RECOMMEND`: 구매자 서명 누락, 계약서 1,350,000원 ↔ 지출 증빙 1,320,000원 불일치 | `PASS` |
| 영수증 첨부철 (`receipts`) | `UNVERIFIABLE`: 금액 불일치 | `PASS` |

`backend/README.md`: "`AiAnalysisService`는 현재 `MockAiAnalysisService` 구현만 사용합니다. … Azure AI와 OpenAI 호출은 없습니다."

### 2-2. 프론트엔드의 AI 표시 (모두 Mock)

| 화면 | 코드 | 동작 |
|---|---|---|
| 신청자 서류 점검 (B2·B3) | `src/api.ts` `mapFinding` | 백엔드 findings를 화면 항목으로 변환 |
| 개인 점검 C3 AI 체크리스트 | `src/personal/personalMock.ts` `mockCheck` | "시연용 가짜 AI". 두 번째 서류는 처음 올리면 오류 1개, 다시 올리면 통과 |
| 담당자 D6 AI 결과 | `src/admin/mockAdminData.ts` `getIssues` | 신청자별 오류·확인 수에 맞춰 고정 문구를 보여줌 |
| 새 프로젝트 D3 "AI가 이해한 기준 미리보기" | `src/admin/projectDraft.ts` `previewCriteria` | AI가 아님. 공고문의 `-` 줄과 제출 서류·기간·마감 줄을 뽑아 보여줌(화면에 "시연용 예시" 표시) |

## 3. 외부 서비스·모델·규칙과 출처

| 구분 | 이름 | 쓰는 곳 | 저장소에서 확인 | 출처(URL·양식·기준 문서) |
|---|---|---|---|---|
| 인증·저장 | Supabase Auth, Storage, Postgres | 로그인, PDF 저장, 검사 결과 저장 | 예 (`src/supabase.ts`, `SupabaseFileStorage`, `backend/supabase/migrations`) | 해당 없음 |
| OCR | Azure OCR | 검수 2단계 | 아니요 (호출 코드 없음) | **AI 담당 확인 필요** |
| LLM | OpenAI | 검수 3단계, 체크리스트 1단계 | 아니요 (호출 코드 없음) | **AI 담당 확인 필요** (모델 이름·버전) |
| 웹 검색 | (도구 미확인) | 체크리스트 2단계 | 아니요 | **AI 담당 확인 필요** |
| 검수 규칙 | 서명·날인, 금액 일치 등 | 검수 4단계 | Mock 문구로만 있음 (2-1) | **AI 담당 확인 필요** (근거 규정·공고문) |
| 표준 양식 | 사업계획서·물품매매계약서·영수증 첨부철 양식 | 검수 기준 | 아니요 (양식 파일·URL 없음) | **AI 담당 확인 필요** |
| 시연 공고문 | 2026 창업동아리 지원사업 정산 안내 | 화면 예시 | 예 (`exampleGuide`, CLAUDE.md 시연 데이터) | 시연용으로 만든 가상 공고문 |

코드에서 찾은 출처 URL: **없음**. 저장소 안에는 AI가 참고하는 기준 문서·표준 양식·외부 URL이 하나도 없습니다.

## 4. 학습·테스트 데이터와 정확도

| 항목 | 내용 |
|---|---|
| 학습(파인튜닝) 데이터 출처 | AI 담당 확인 필요 |
| 테스트 데이터 출처 | AI 담당 확인 필요 |
| 테스트 데이터 개수 | AI 담당 확인 필요 |
| 정확도(재현율·정밀도 등) | AI 담당 확인 필요 |
| 평가 방법 | AI 담당 확인 필요 |

저장소에는 AI 평가 스크립트나 테스트 데이터셋이 없습니다. 백엔드 테스트(`backend/src/test`)는 JWT 인증, 신청자 접근 권한, 제출 흐름(업로드 → 제출 → 보완 → 재제출 기록), 위조·미지원 파일 거부, 4MB 초과 기록만 검사하며 AI 정확도는 다루지 않습니다.

## 5. 개인정보

### 지금 상태
- **PDF 원본이 OpenAI로 전송됩니다.** AI 담당 설명 기준이며, 이 저장소에는 해당 호출 코드가 없어 직접 확인하지는 못했습니다. 저장소의 데모 경로는 Mock이라 외부로 보내지 않습니다.
- **합성·비식별 자료로만 테스트하고 있습니다.** 시연 데이터(김청년 20231234 등)는 모두 가상 인물이고, 이메일은 `example.com` 또는 가상 주소입니다.
- PDF는 Supabase Storage Private 버킷(`expense-documents`)에 저장합니다. 경로는 `{Supabase user UUID}/{random file UUID}.pdf`이고, 사용자 JWT로 접근해 RLS를 따릅니다(README).

### 앞으로 넣을 비식별화 단계
1. **OCR 뒤, OpenAI 앞에서 마스킹:** PDF 원본 대신 OCR 텍스트를 보내고, 이름·학번·주민등록번호·계좌번호·전화번호·주소·서명 이미지를 `[이름]`, `[학번]`처럼 바꿔서 보냅니다.
2. **검사에 필요한 값만 남기기:** 금액, 날짜, 서명 칸이 채워졌는지 여부처럼 규칙에 필요한 값만 보냅니다.
3. **외부 API 설정:** OpenAI 데이터 보관·학습 미사용 설정, 리전, 키 관리를 AI 담당이 확인해 이 문서에 적습니다.
4. **화면 마스킹:** 담당자 화면에서도 학번·이메일 일부를 가립니다(추후 계획).
5. **보관 기간:** 원본 PDF와 OCR 결과의 보관·삭제 기한을 정합니다.

## 6. 발표 슬라이드 하단 출처 (한 줄)

> AI 처리: Azure OCR(텍스트 추출) + OpenAI(보조 분석), 검수 규칙은 공고문 기준 · 시연 화면의 검사 결과는 Mock · 시연 데이터는 합성·비식별 자료 · 모델·버전·정확도는 AI 담당 확인 후 표기

모델 이름과 버전을 받으면 "Azure OCR"과 "OpenAI" 뒤에 붙여 주세요. 체크리스트에 출처 URL을 실제로 보여준다면 "체크리스트 출처: 발급기관 공식 페이지(URL 표기)"를 덧붙이면 됩니다.
