# Receipt authentication investigation

The UI performs upload, reads the resulting inspection, and on an Edge 401 attempts a Supabase session refresh before one inspection retry. Refresh failure prevents that inspection retry; the original AI_ERROR inspection remains visible. These are two distinct failures, not evidence that Azure rejected the PDF.

## Local findings

- React uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Spring uses `app.supabase.url` / `SUPABASE_URL` and `app.supabase.publishable-key` / `SUPABASE_PUBLISHABLE_KEY`.
- The local root `.env` inspected during this investigation contained the frontend settings only. The tool process had no backend Supabase environment settings. This does **not** establish the configuration of a separately launched Spring JVM.
- Spring forwards the authenticated user's JWT as `Authorization: Bearer ...`, and its configured publishable key as `apikey` for both function names.
- The supplied v2 reference source returns `UNAUTHORIZED` when its internal `getUser()` fails. No old-function source or deployed per-function `verify_jwt` configuration was available for comparison.
- No authenticated browser session or recorded refresh response was available in the attached browser. Root cause remains unconfirmed.

## Safe evidence to collect

Use existing failed requests/logs where possible; do not repeat a paid analysis just to diagnose authentication.

1. Refresh endpoint HTTP status and allowlisted `code` / `error_code` only. Do not export HAR files, headers, request bodies, token responses, or session storage.
2. Spring diagnostic fields: `issuer_matches`, `token_lifetime`, `public_key_configured`, `httpStatus`, `errorCode`, `sbErrorCode`, `authStageHint`.
3. In the function dashboard compare old and v2 project, JWT verification settings and invocation presence at the failed request time. Keep verification enabled; do not use a service-role key to bypass authentication.
4. Compare the frontend and the separately running Spring process settings privately. Opaque publishable keys cannot be mapped to a project by decoding them. The Edge function's own Auth client configuration must also belong to that project.

`GATEWAY_REPORTED` records a Gateway error header. `GATEWAY_AUTH_SUSPECTED` matches known Gateway error text. `FUNCTION_AUTH_SUSPECTED` matches the reference function's UNAUTHORIZED shape. None replaces correlation with invocation logs; ambiguous errors remain `UNDETERMINED`.

Refresh `refresh_token_not_found`, `refresh_token_already_used`, or `session_not_found` supports an invalid/revoked session diagnosis and requires a fresh login. A network/rate-limit failure requires checking connectivity or waiting for the service to recover. Token rotation races and project mismatch remain hypotheses unless these observations support them.

Changes require a separately approved backend restart to affect the current JVM. Preserve existing submissions before any restart, especially when using the memory repository. No restart, external AI call or deployment was performed for this change.
