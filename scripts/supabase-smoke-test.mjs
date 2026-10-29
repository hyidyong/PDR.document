import { createClient } from '@supabase/supabase-js'

const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_TEST_EMAIL', 'SUPABASE_TEST_PASSWORD']
for (const name of required) if (!process.env[name]) throw new Error(`${name} 환경변수가 필요합니다.`)

const api = process.env.MODIT_API_URL ?? 'http://localhost:8080'
const projectId = 'modit-2026'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY)
const { data, error } = await supabase.auth.signInWithPassword({ email: process.env.SUPABASE_TEST_EMAIL, password: process.env.SUPABASE_TEST_PASSWORD })
if (error || !data.session || !data.user) throw error ?? new Error('Supabase JWT를 발급받지 못했습니다.')

const headers = { Authorization: `Bearer ${data.session.access_token}` }
const currentApplicant = await fetch(`${api}/api/projects/${projectId}/applicants/me`, { headers })
if (!currentApplicant.ok) throw new Error(`Spring JWT/신청자 조회 실패: ${currentApplicant.status} ${await currentApplicant.text()}`)
const applicant = await currentApplicant.json()

const before = await supabase.storage.from('expense-documents').list(data.user.id)
if (before.error) throw before.error
const pdf = new Blob(['%PDF-1.4\n% MODIT integration smoke test\n'], { type: 'application/pdf' })
const form = new FormData()
form.append('file', pdf, `smoke-${Date.now()}.pdf`)
const upload = await fetch(`${api}/api/projects/${projectId}/applicants/${applicant.id}/documents/plan`, { method: 'POST', headers, body: form })
if (!upload.ok) throw new Error(`Storage 업로드 실패: ${upload.status} ${await upload.text()}`)

const after = await supabase.storage.from('expense-documents').list(data.user.id)
if (after.error) throw after.error
const previous = new Set(before.data.map((item) => item.name))
const created = after.data.find((item) => !previous.has(item.name) && /^[0-9a-f-]{36}\.pdf$/.test(item.name))
if (!created) throw new Error('사용자 UUID/파일 UUID.pdf 경로의 새 객체를 확인하지 못했습니다.')

console.log(JSON.stringify({ jwtSubject: data.user.id, applicantId: applicant.id, storagePath: `${data.user.id}/${created.name}` }, null, 2))
await supabase.auth.signOut()
