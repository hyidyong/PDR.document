# 모딧(MODIT) 개발 안내

서류 사전 점검 서비스. 신청자가 서류를 올리면 AI가 제출 전에 오류를 알려주고, 담당자는 제출 현황을 보고 보완 요청·승인을 한다.

- 프론트: React + TypeScript + Vite (`src/`)
- 백엔드: Spring Boot (`backend/`, 자세한 API는 `backend/README.md`)

## 디자인으로 화면 만들기

디자인 원본은 `design/modit_all.pen`(Pencil 파일, 내부는 JSON)이다. 파일이 크므로 **전체를 읽지 말고** 필요한 화면만 뽑아서 읽는다.

```
node design/extract-frame.mjs --list              # 화면 목록
node design/extract-frame.mjs "D5 프로젝트 대시보드"  # design/out/D5.json 으로 저장
```

뽑은 JSON에는 각 요소의 layout, gap, padding, fill(색), cornerRadius, 글자 내용이 있다. 구성과 문구를 최대한 그대로 따른다. 색·값은 `design/out/design_variables.json`과 `src/index.css`의 `--color-*` 변수 중 가까운 것을 쓴다.

화면 코드:
- A 계정: A1 로그인(데모 체험 버튼), A2 회원가입 역할 선택, A3 프로필 메뉴
- B 기관 제출 흐름(신청자): B1 입장, B2·B3 서류 점검, B4 제출(미비) 확인, B5 내 제출함-보완 요청, B6 재점검, B7 승인 완료, B2-a/b/c 상태 화면
- C 개인 점검 흐름: C1 홈, C2 기준 입력, C3 AI 체크리스트, C4 점검 완료
- D 담당자 흐름: D1 홈, D2 명단, D3 제출 서류, D4 링크 공유, D5 대시보드, D6 신청자 상세, D7 보완 요청, D8 ZIP 다운로드, D9 승인 완료

## 코드 규칙

- 이미 있는 화면(`src/screens`, `src/admin`)은 요청이 없으면 다시 만들거나 고치지 않는다. 새 화면은 새 파일로 추가한다.
- 담당자 화면은 `src/admin`, 로그인은 `src/auth`, 개인 점검은 `src/personal`에 둔다.
- `package.json`, `vite.config.ts`, `backend/`는 담당자와 상의 없이 수정하지 않는다.
- 새 CSS에 `font-family`를 따로 지정하지 않는다(`src/index.css` 글꼴 사용).
- 기존 공통 컴포넌트(`Button`, `StatusBadge`, `BrandLogo`, `.app-header` 등)를 재사용한다.
- 작업 전에 어떤 파일을 만들고 고칠지 계획부터 보여준다.

## 제출 상태 이름

| 화면 | 백엔드 |
|---|---|
| 미제출 | DRAFT |
| 제출 | SUBMITTED |
| 제출(미비) | SUBMITTED_INCOMPLETE |
| 보완 필요 | NEEDS_REVISION |
| 재제출 | REVIEW_PENDING |
| 승인 | APPROVED |

## 시연 데이터

한국대학교 창업지원단 · 2026 창업동아리 지원사업 정산 · 마감 10월 31일(토). 서류: 사업계획서, 물품매매계약서, 영수증 첨부철. 신청자 김청년(20231234): 10.28 15:20 제출(미비)(매수인 서명·날인 누락, 계약 금액 1,350,000원 ↔ 영수증 합계 1,320,000원) → 10.29 보완 요청 → 10.30 10:10 재점검 통과 후 재제출 → 10.30 14:00 승인.
