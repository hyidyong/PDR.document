# React + TypeScript + Vite

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
