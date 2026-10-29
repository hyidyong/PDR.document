type Session = { access_token: string; refresh_token?: string; expires_at?: number }
type AuthResult = { data: { session: Session | null }; error: unknown }
type SessionAuth = { getSession: () => Promise<AuthResult>; refreshSession: () => Promise<AuthResult> }

const SAFE_CODES = new Set([
  'refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired',
  'bad_jwt', 'invalid_credentials', 'over_request_rate_limit', 'request_timeout',
])

export class SessionAccessError extends Error {
  status = 401
  code: string
  stage: 'session' | 'refresh'
  upstreamStatus: number | null

  constructor(stage: 'session' | 'refresh', code: string, upstreamStatus: number | null = null) {
    const prefix = stage === 'refresh' ? '로그인 세션 갱신에 실패했습니다.' : '로그인 세션을 확인하지 못했습니다.'
    const action = code === 'NETWORK_ERROR' || code === 'AUTH_RATE_LIMIT'
      ? '네트워크 연결을 확인한 뒤 다시 시도해 주세요.' : '다시 로그인한 뒤 재시도해 주세요.'
    super(`${prefix} ${action} [${stage}/${code}${upstreamStatus ? ` / HTTP ${upstreamStatus}` : ''}]`)
    this.name = 'SessionAccessError'
    this.code = code
    this.stage = stage
    this.upstreamStatus = upstreamStatus
  }
}

function safeAuthError(stage: 'session' | 'refresh', error: unknown): SessionAccessError {
  const detail = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
  const status = typeof detail.status === 'number' && Number.isInteger(detail.status)
    && detail.status >= 100 && detail.status <= 599 ? detail.status : null
  const code = typeof detail.code === 'string' && SAFE_CODES.has(detail.code) ? detail.code
    : error instanceof TypeError || detail.name === 'AuthRetryableFetchError' ? 'NETWORK_ERROR'
    : detail.name === 'AuthSessionMissingError' ? 'SESSION_MISSING'
    : status === 429 ? 'AUTH_RATE_LIMIT' : 'AUTH_ERROR'
  return new SessionAccessError(stage, code, status)
}

/** Share one refresh across API callers. No token or raw Auth error is logged. */
export function createSessionAccess(auth: SessionAuth, now = () => Math.floor(Date.now() / 1000)) {
  let refreshing: Promise<Session> | null = null

  async function refresh(): Promise<Session> {
    if (!refreshing) {
      refreshing = (async () => {
        let result: AuthResult
        try { result = await auth.refreshSession() } catch (error) { throw safeAuthError('refresh', error) }
        if (result.error) throw safeAuthError('refresh', result.error)
        const session = result.data.session
        if (!session?.access_token) throw new SessionAccessError('refresh', 'SESSION_MISSING')
        if (!Number.isFinite(session.expires_at) || session.expires_at! <= now()) {
          throw new SessionAccessError('refresh', 'INVALID_SESSION_EXPIRY')
        }
        return session
      })()
    }
    const pending = refreshing
    try { return await pending } finally { if (refreshing === pending) refreshing = null }
  }

  return async (forceRefresh = false): Promise<string> => {
    let result: AuthResult
    try { result = await auth.getSession() } catch (error) { throw safeAuthError('session', error) }
    if (result.error) throw safeAuthError('session', result.error)
    let session = result.data.session
    if (!session?.access_token) throw new SessionAccessError('session', 'SESSION_MISSING')
    if (forceRefresh || !Number.isFinite(session.expires_at) || session.expires_at! - now() <= 180) {
      if (!session.refresh_token) throw new SessionAccessError('refresh', 'REFRESH_TOKEN_MISSING')
      session = await refresh()
    }
    return session.access_token
  }
}
