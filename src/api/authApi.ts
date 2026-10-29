// Login for the A 계정 screens: a thin layer over signIn() and getCurrentApplicant() in src/api.ts (Supabase).
// It adds per-field errors for the A1 form and the signed-in user's name/email for the screens.
// The role is not decided at login; the user picks it on A2 after signing in.
import { ApiError, getCurrentApplicant, signIn, signOut } from '../api'
import type { Applicant, ProjectView } from '../api'
import { supabase } from '../supabase'

export type UserRole = 'applicant' | 'admin'
export type SessionUser = { name: string; email: string; role?: UserRole }
export type LoginOutcome = { project: ProjectView; user: SessionUser }

/** A login failure tied to the input it should be shown under. */
export class AuthError extends Error {
  readonly field: 'email' | 'password'
  constructor(field: 'email' | 'password', message: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}

/** The signed-in account has no 신청자 record (backend 404, or 403 when app_metadata has no applicant_id). */
export class NoApplicantError extends Error {
  constructor() {
    super('이 계정은 신청 정보가 없어요')
    this.name = 'NoApplicantError'
  }
}

/** The backend could not be reached (stopped, crashed, or not answering). */
export class ServerUnavailableError extends Error {
  constructor() {
    super('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요')
    this.name = 'ServerUnavailableError'
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SERVER_TIMEOUT_MS = 10_000

// A stopped backend shows up as a failed fetch (TypeError) or, through the Vite dev proxy, a 5xx;
// a backend that never answers is cut off after SERVER_TIMEOUT_MS. All become ServerUnavailableError.
async function reachServer<T>(task: Promise<T>): Promise<T> {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new ServerUnavailableError()), SERVER_TIMEOUT_MS) })
  try {
    return await Promise.race([task, timeout])
  } catch (error) {
    if (error instanceof ServerUnavailableError) throw error
    if (error instanceof TypeError || (error instanceof ApiError && error.status >= 500)) {
      console.error('[auth] 백엔드에 연결하지 못했어요', error)
      throw new ServerUnavailableError()
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

export async function login(email: string, password: string): Promise<LoginOutcome> {
  const trimmed = email.trim()
  if (!trimmed) throw new AuthError('email', '이메일을 입력해 주세요')
  if (!EMAIL_PATTERN.test(trimmed)) throw new AuthError('email', '이메일 형식이 맞지 않아요')
  if (!password) throw new AuthError('password', '비밀번호를 입력해 주세요')

  let project: ProjectView
  try {
    project = await reachServer(signIn(trimmed, password))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new AuthError('password', error.message)
    if (error instanceof ServerUnavailableError) void signOut()
    throw error
  }

  const { data } = await supabase.auth.getSession()
  const authUser = data.session?.user
  const metadataName = typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name : undefined
  return { project, user: { name: metadataName ?? trimmed.split('@')[0], email: authUser?.email ?? trimmed } }
}

/** Called when the 사용자 card is picked on A2. */
export async function chooseApplicant(): Promise<Applicant> {
  try {
    return await reachServer(getCurrentApplicant())
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) throw new NoApplicantError()
    throw error
  }
}

export const logout = () => signOut()
