// Login for the A 계정 screens.
// Only the two demo accounts work for now. When the backend is ready, replace the bodies of
// login() and logout() with API calls (see docs/frontend-api-spec.md); the screens stay the same.

export type UserRole = 'APPLICANT' | 'REVIEWER'
export type SessionUser = { id: string; name: string; email: string; role: UserRole; organization: string }
export type Session = { token: string; user: SessionUser }

/** A login failure tied to the input it should be shown under. */
export class AuthError extends Error {
  readonly field: 'email' | 'password'
  constructor(field: 'email' | 'password', message: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}

const DEMO_PASSWORD = 'demo1234'
const demoUsers: SessionUser[] = [
  { id: 'applicant-001', name: '김청년', email: 'applicant@example.com', role: 'APPLICANT', organization: '한국대학교 창업동아리 스타트온' },
  { id: 'reviewer-001', name: '박담당', email: 'admin@example.com', role: 'REVIEWER', organization: '한국대학교 창업지원단' },
]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(email: string, password: string): Promise<Session> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw new AuthError('email', '이메일을 입력해 주세요')
  if (!EMAIL_PATTERN.test(normalized)) throw new AuthError('email', '이메일 형식이 맞지 않아요')
  if (!password) throw new AuthError('password', '비밀번호를 입력해 주세요')
  const user = demoUsers.find((item) => item.email === normalized)
  if (!user || password !== DEMO_PASSWORD) throw new AuthError('password', '이메일 또는 비밀번호가 맞지 않아요')
  return { token: `demo-${user.id}-${Date.now()}`, user: { ...user } }
}

/** Ends the session on the server. The demo has no server session, so there is nothing to do. */
export async function logout(): Promise<void> {}
