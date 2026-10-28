# MODIT 개발용 백엔드

Java 21 + Spring Boot 4.1.2 + Gradle 기반 독립 서버입니다. 기존 React 화면은 아직 이 API에 연결되지 않았습니다.

## 실행

Java 21을 설치하고 `backend` 디렉터리에서 실행합니다.

```powershell
cd backend
.\gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

기본 주소는 `http://localhost:8080`입니다. `./gradlew test`와 `./gradlew build`로 검증합니다. 개발용 API를 사용하려면 위처럼 **dev** 프로필을 명시해야 합니다. 프로필을 지정하지 않으면 mock 인증이 꺼지고 신청자 API를 사용할 수 없습니다. 운영 배포 전에는 실제 인증, 영구 저장소, 환경별 CORS를 연결해야 합니다.

개발용 신청자: 프로젝트 `modit-2026`, 신청자 `applicant-001`, 이름 `김청년`, 학번 `20231234`. 신청자 전용 API에는 `X-Dev-Applicant-Id: applicant-001` 헤더를 보냅니다. 담당자 보완 요청 시연 API에는 `X-Dev-Role: REVIEWER` 헤더를 보냅니다. 이 헤더는 **인증 수단이 아니며 개발 전용**입니다.

## API

기본 경로: `/api/projects/{projectId}`. 신청자 경로: `/applicants/{applicantId}`.

| 메서드 | 경로(기본 경로 뒤) | 기능 |
| --- | --- | --- |
| GET | `/` | 프로젝트 조회 |
| GET | `/requirements` | 필수 서류 목록 |
| POST | `/applicants/verify` | 이름·학번 본인 확인 (`{ "name": "김청년", "studentId": "20231234" }`) |
| GET | `/applicants/{applicantId}` | 신청자 정보 조회 |
| POST | `/applicants/{applicantId}/documents/{requirementId}` | `file` multipart 업로드 및 mock 자동 검사 |
| GET | `/applicants/{applicantId}/documents` | 모든 파일 버전 조회 |
| GET | `/applicants/{applicantId}/documents/{requirementId}/versions/{version}/file` | 보관 파일 다운로드 |
| POST | `/applicants/{applicantId}/documents/{requirementId}/inspections` | 현재 파일 재검사 |
| GET | `/applicants/{applicantId}/documents/{requirementId}/inspections` | 검사 이력 |
| POST | `/applicants/{applicantId}/submission` | 최종 최초 제출 확정 |
| GET | `/applicants/{applicantId}/submission` | 현재 제출 상태·파일·검사·승인 상태 |
| GET | `/applicants/{applicantId}/feedback` | 담당자 보완 요청 |
| POST | `/applicants/{applicantId}/resubmission` | 최종 재제출 확정 |
| GET | `/applicants/{applicantId}/history` | 제출·검사·피드백·활동 이력 |
| POST | `/api/dev/projects/{projectId}/applicants/{applicantId}/feedback` | 개발 전용 담당자 보완 요청 (`{ "comment": "...", "targetRequirementIds": ["contract", "receipts"] }`) |

서류 ID는 `plan`, `contract`, `receipts`입니다. 업로드는 `DRAFT` 또는 `NEEDS_REVISION` 상태에서만 가능하고, 보완 중에는 지정된 서류만 교체할 수 있습니다. 업로드와 검사는 제출 상태를 바꾸지 않습니다. 최초 확정 시 모두 통과하면 `SUBMITTED`, 미비가 있으면 `SUBMITTED_INCOMPLETE`가 됩니다. 보완 요청 시 `NEEDS_REVISION`, 보완 대상의 새 버전이 모두 검사 통과한 뒤 최종 재제출을 확정하면 `REVIEW_PENDING`입니다. `SUBMITTED_INCOMPLETE`와 `SUBMITTED`는 별도 상태입니다. 담당자 승인 상태는 AI 검사 결과와 별도로 `PENDING`으로 저장합니다.

## 임시 저장과 향후 연동

메타데이터는 메모리에만 보관되어 **서버를 재시작하면 제출 상태·이력이 사라집니다**. 파일은 기본적으로 OS 임시 디렉터리의 `modit-backend-uploads`에 저장되며 재시작 후 고아 파일이 남을 수 있습니다. `APP_STORAGE_ROOT` 환경 변수 또는 `app.storage-root` 설정으로 위치를 바꿀 수 있습니다. `backend/uploads/`와 빌드 산출물은 Git에서 제외합니다. 파일은 PDF/PNG/JPEG/GIF/WebP, 최대 20 MiB이며 확장자·MIME·파일 헤더를 확인합니다.

`AiAnalysisService`는 현재 `MockAiAnalysisService` 구현만 사용합니다. `source: "MOCK"`로 실제 분석과 구분합니다. 버전 1의 계약서는 `RECOMMEND`, 지출 증빙은 `UNVERIFIABLE`, 사업계획서는 `PASS`; 교체 버전은 `PASS`로 동작합니다. Azure AI와 OpenAI 호출은 없습니다.

Supabase 연결에는 프로젝트 URL, PostgreSQL 접속 정보(호스트·포트·DB·사용자·비밀번호), Storage 버킷 이름 및 서버 측 자격 증명, RLS/권한 정책 설계가 필요합니다. Azure AI 연결에는 사용하는 서비스 종류와 엔드포인트, 리전, 배포/모델 이름, 인증 키 또는 관리 ID, 문서 분석 스키마가 필요합니다. 보조 OpenAI 연결에는 API 키와 모델/비용 한도가 필요합니다. 모든 비밀은 환경 변수 또는 비밀 관리 서비스에만 보관해야 합니다.
