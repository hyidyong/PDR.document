# MODIT demo runbook

## Deployment mode

The demo deployment intentionally uses `APP_REPOSITORY_PROVIDER=memory`. Do not
set it to `jdbc` until a JDBC repository exists and the migrations have been
approved and applied. PDF objects are stored in Supabase Storage, but submission
metadata in memory is lost whenever the Render process restarts or redeploys.

### Render backend

Create a Blueprint from `render.yaml`, then set these values in the Render
dashboard without committing them:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `APP_CORS_ORIGINS`: the exact Vercel production origin, for example
  `https://your-project.vercel.app`

Keep `APP_REPOSITORY_PROVIDER=memory`. After deployment, verify that a protected
API request without a bearer token returns 401.

### Vercel frontend

Import the repository as a Vite project and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`: the Render origin without a trailing slash

Redeploy after changing any Vite environment variable because it is embedded at
build time.

## Local fallback

Use two terminals from the repository root.

Backend (PowerShell):

```powershell
$env:APP_REPOSITORY_PROVIDER = 'memory'
$env:APP_STORAGE_PROVIDER = 'supabase'
$env:SUPABASE_URL = '<project URL>'
$env:SUPABASE_PUBLISHABLE_KEY = '<publishable key>'
$env:APP_CORS_ORIGINS = 'http://localhost:5173'
Set-Location backend
.\gradlew.bat bootRun
```

Frontend:

```powershell
npm install
npm run dev
```

The frontend uses the Vite `/api` proxy in local development. Keep
`VITE_API_BASE_URL` empty locally.

## Stable demo sequence

1. Start the backend first and leave it running for the entire demo.
2. Sign in with the prepared applicant Supabase account.
3. Upload three PDFs smaller than 4MB. The current inspection is explicitly a
   mock result and does not read PDF contents.
4. Submit and open the submission inbox.
5. Sign out, then sign in with the prepared admin account.
6. Show the admin design only as mock data. Its submission list, PDF preview,
   revision request, and approval controls are not connected to backend data.
7. Do not restart the backend between applicant and admin demonstrations.

Before the presentation, rehearse once with fresh process state. If Render is
slow, unavailable, or has restarted, use the local fallback rather than claiming
that persisted submission metadata is still present.
