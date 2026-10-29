// Login for the A 계정 screens: a thin layer over signInAndResolveUser() in src/api.ts (Supabase).
// It adds per-field errors for the A1 form and the signed-in user's name/email for the screens.
import { ApiError, signInAndResolveUser, signOut } from '../api'
import type { LoginResult } from '../api'
import { supabase } from '../supabase'

export type UserRole = LoginResult['kind']
export type SessionUser = { name: string; email: string; role: UserRole }
export type LoginOutcome = LoginResult & { user: SessionUser }

/** A login failure tied to the input it should be shown under. */
export class AuthError extends Error {
  readonly field: 'email' | 'password'
  constructor(field: 'email' | 'password', message: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(email: string, password: string): Promise<LoginOutcome> {
  const trimmed = email.trim()
  if (!trimmed) throw new AuthError('email', '이메일을 입력해 주세요')
  if (!EMAIL_PATTERN.test(trimmed)) throw new AuthError('email', '이메일 형식이 맞지 않아요')
  if (!password) throw new AuthError('password', '비밀번호를 입력해 주세요')

  let result: LoginResult
  try {
    result = await signInAndResolveUser(trimmed, password)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new AuthError('password', error.message)
    throw error
  }

  const { data } = await supabase.auth.getSession()
  const authUser = data.session?.user
  const metadataName = typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name : undefined
  const name = result.kind === 'applicant' ? result.applicant.name : metadataName ?? trimmed.split('@')[0]
  return { ...result, user: { name, email: authUser?.email ?? trimmed, role: result.kind } }
}

export const logout = () => signOut()
