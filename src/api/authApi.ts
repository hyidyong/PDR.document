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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(email: string, password: string): Promise<LoginOutcome> {
  const trimmed = email.trim()
  if (!trimmed) throw new AuthError('email', '이메일을 입력해 주세요')
  if (!EMAIL_PATTERN.test(trimmed)) throw new AuthError('email', '이메일 형식이 맞지 않아요')
  if (!password) throw new AuthError('password', '비밀번호를 입력해 주세요')

  let project: ProjectView
  try {
    project = await signIn(trimmed, password)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new AuthError('password', error.message)
    throw error
  }

  const { data } = await supabase.auth.getSession()
  const authUser = data.session?.user
  const metadataName = typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name : undefined
  return { project, user: { name: metadataName ?? trimmed.split('@')[0], email: authUser?.email ?? trimmed } }
}

/** Called when 서류를 내요 is picked on A2. */
export async function chooseApplicant(): Promise<Applicant> {
  try {
    return await getCurrentApplicant()
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) throw new NoApplicantError()
    throw error
  }
}

export const logout = () => signOut()
