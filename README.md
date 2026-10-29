# React + TypeScript + Vite

## 처음 받은 사람이 실행하는 법

준비물: Node.js 20.19 이상(Vite 8), Java 21. 터미널 두 개를 씁니다. 아래 명령은 Windows PowerShell 기준입니다.

### 1. 환경 변수 파일 만들기

값은 팀 담당자에게 따로 받습니다. `.env`, `backend/.env`는 Git에 올리지 않습니다.

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

루트 `.env`

| 키 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable 키 |
| `VITE_API_BASE_URL` | 로컬에서는 **비워 둠**(Vite가 `/api`를 `localhost:8080`으로 넘김) |
| `VITE_DEMO_APPLICANT_EMAIL` | [사용자 데모] 버튼용 신청자 계정 이메일. 비우면 버튼이 숨겨짐 |
| `VITE_DEMO_APPLICANT_PASSWORD` | 위 계정 비밀번호. `VITE_` 값은 빌드 결과에 그대로 들어가니 시연용 계정만 사용 |

`backend/.env`

| 키 | 설명 |
|---|---|
| `SUPABASE_URL` | 루트 `VITE_SUPABASE_URL`과 같은 값 |
| `SUPABASE_PUBLISHABLE_KEY` | 루트 `VITE_SUPABASE_PUBLISHABLE_KEY`와 같은 값 |
| `APP_REPOSITORY_PROVIDER` | `memory` (DB 없이 실행. 백엔드를 끄면 제출 데이터가 사라짐) |
| `SUPABASE_DB_*` | `memory`일 때는 쓰지 않음 |

> 터미널에 `$env:SUPABASE_URL`처럼 직접 넣은 값은 `.env`보다 먼저 쓰입니다. 백엔드 로그의 `issuer=`가 `YOUR_PROJECT_REF`로 나오면 새 터미널을 열어 다시 실행하세요.

### 2. 설치

```powershell
npm install
```

### 3. 백엔드 실행 (터미널 1)

```powershell
cd backend
.\gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

`Started ModitApplication`이 보이면 준비된 것입니다. 주소는 `http://localhost:8080`입니다.

### 4. 프론트 실행 (터미널 2)

```powershell
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

### 5. 시연 데이터 초기화

`http://localhost:5173/?reset=1`로 연 뒤 담당자 화면에 들어가면(로그인 → [담당자] 카드, 또는 [담당자 데모]) 담당자 화면 Mock 데이터가 처음 상태로 돌아갑니다. 신청자 제출 데이터는 백엔드 메모리에 있으므로 백엔드를 다시 켜야 초기화됩니다.

### 6. 데모 버튼 (A1 로그인 화면)

| 버튼 | 하는 일 | 필요한 것 |
|---|---|---|
| 로그인 | 로그인 → 역할 선택 → [담당자] 카드는 담당자 홈(D1) / [사용자] 카드는 사용자 홈 | Supabase 계정, 백엔드 |
| [사용자 데모] | 위 `VITE_DEMO_APPLICANT_*` 계정으로 로그인해 사용자 홈으로 바로 이동 | `.env` 두 값, 백엔드 |
| [담당자 데모] | 로그인 없이 담당자 화면(D1~D12)을 Mock 데이터로 열기 | 없음(백엔드가 꺼져 있어도 됨) |
| 기관 링크 없이 혼자 점검하기 | 개인 점검(C 흐름) | 없음 |

담당자 화면(D1~D12)은 아직 Mock 데이터입니다. 헤더 메뉴는 홈 → D1, 프로젝트 → D12 프로젝트 목록(누르면 그 프로젝트의 D5), 신청자 → D11 전체 신청자, 서류 관리 → D10 서류 현황입니다. 이름 옆 알림 벨은 최근 제출·재제출·보완 요청·승인 10개를 보여주고, 누르면 그 신청자의 D6이 열립니다. D1 [새 프로젝트 만들기]로 프로젝트 생성 마법사(D2~D4)를 열 수 있습니다.

**역할 바꾸기:** 오른쪽 위 프로필 → **[역할 다시 고르기]**를 누르면 A2 역할 선택으로 돌아갑니다(로그인했을 때만, 담당자·사용자 화면 모두). 브라우저 **뒤로가기**로 A2까지 돌아가거나, **로그아웃** 후 [사용자 데모]·[담당자 데모]를 누릅니다. 뒤로가기는 로그인 후 A2에서 멈추고, 로그아웃한 뒤에는 로그인 후 화면으로 돌아가지 않습니다.

자세한 내용은 `docs/frontend-api-spec.md`, 시연 순서는 `docs/demo-checklist.md`를 봅니다.

## MODIT Supabase Auth / Storage 설정

프론트엔드는 Supabase 이메일·비밀번호 로그인으로 사용자 JWT를 발급받습니다. Spring Boot는 Supabase JWKS로 JWT 서명과 issuer, `authenticated` audience를 검증하고 `app_metadata.applicant_id`로 신청자를 조회합니다.

1. 루트의 `.env.example`을 참고하여 Git에 포함되지 않는 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정합니다.
2. `backend/.env.example`의 값을 서버 환경변수로 설정합니다. secret/service-role key는 사용하지 않습니다.
3. Supabase Auth에 테스트 이메일 사용자를 만들고 이메일을 확인 처리한 뒤, 해당 사용자의 관리자 전용 app metadata에 `{ "applicant_id": "applicant-001" }`를 설정합니다.
4. `expense-documents` 버킷을 Private, MIME `application/pdf`, 최대 10MB로 유지합니다.
5. SQL Editor에서 `backend/supabase/storage-policies.sql`을 실행합니다.
6. Auth JWT Signing Keys에서 비대칭 키(RS256 또는 ES256)를 사용해야 Spring Boot가 JWKS로 비밀 키 없이 검증할 수 있습니다.

백엔드는 `APP_STORAGE_PROVIDER=supabase`로 실행합니다. 로컬 단위 테스트만 `app.storage.provider=local`을 사용합니다. 저장 객체 경로는 `{Supabase user UUID}/{random file UUID}.pdf`이며, 사용자 JWT를 Storage에 전달하므로 RLS를 우회하지 않습니다.

백엔드를 실행한 상태에서 `SUPABASE_TEST_EMAIL`, `SUPABASE_TEST_PASSWORD`까지 환경변수로 지정하고 `npm run test:supabase`를 실행하면 실제 JWT 발급, Spring 신청자 조회, Storage 업로드와 경로를 확인합니다. 이 테스트는 Private 버킷에 작은 PDF 객체 하나를 생성합니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
