import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionAccess, SessionAccessError } from '../src/auth/sessionAccess.ts'

const session = { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_at: 2000 }
const result = (value = session, error = null) => ({ data: { session: value }, error })

test('valid session does not refresh; forced retry refreshes once', async () => {
  let calls = 0
  const access = createSessionAccess({ getSession: async () => result(), refreshSession: async () => {
    calls++; return result({ ...session, access_token: 'synthetic-new' })
  } }, () => 1000)
  assert.equal(await access(), 'synthetic-access')
  assert.equal(calls, 0)
  assert.equal(await access(true), 'synthetic-new')
  assert.equal(calls, 1)
})

test('concurrent expiring-session requests share one refresh', async () => {
  let calls = 0
  let finish
  const access = createSessionAccess({ getSession: async () => result({ ...session, expires_at: 1100 }),
    refreshSession: () => { calls++; return new Promise(resolve => { finish = resolve }) } }, () => 1000)
  const pending = [access(), access(), access(true)]
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
  finish(result())
  assert.deepEqual(await Promise.all(pending), ['synthetic-access', 'synthetic-access', 'synthetic-access'])
})

test('missing refresh token and expired refresh result fail closed', async () => {
  let calls = 0
  const missing = createSessionAccess({ getSession: async () => result({ access_token: 'synthetic', expires_at: 1100 }),
    refreshSession: async () => { calls++; return result() } }, () => 1000)
  await assert.rejects(missing(), error => error.code === 'REFRESH_TOKEN_MISSING')
  assert.equal(calls, 0)
  const expired = createSessionAccess({ getSession: async () => result(),
    refreshSession: async () => result({ ...session, expires_at: 999 }) }, () => 1000)
  await assert.rejects(expired(true), error => error.code === 'INVALID_SESSION_EXPIRY')
})

test('refresh errors preserve only allowlisted code and HTTP status', async () => {
  for (const code of ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found']) {
    const access = createSessionAccess({ getSession: async () => result(), refreshSession: async () =>
      result(null, { code, status: 400, message: 'synthetic-sensitive-text' }) }, () => 1000)
    await assert.rejects(access(true), error => error instanceof SessionAccessError
      && error.stage === 'refresh' && error.code === code && error.upstreamStatus === 400
      && !error.message.includes('synthetic-sensitive-text'))
  }
})

test('unknown codes and thrown network errors never expose raw messages', async () => {
  for (const [failure, expected] of [[{ code: 'synthetic-secret', status: 401 }, 'AUTH_ERROR'],
    [new TypeError('synthetic-secret'), 'NETWORK_ERROR']]) {
    const access = createSessionAccess({ getSession: async () => result(), refreshSession: async () => { throw failure } }, () => 1000)
    await assert.rejects(access(true), error => error.code === expected && !error.message.includes('synthetic-secret'))
  }
})

test('session read errors stop refresh and cannot return a stale token', async () => {
  const access = createSessionAccess({ getSession: async () => result(session, { code: 'session_not_found', status: 401 }),
    refreshSession: async () => { assert.fail('refresh must not run') } }, () => 1000)
  await assert.rejects(access(), error => error.stage === 'session' && error.code === 'session_not_found')
})

test('a failed refresh does not poison a later successful refresh', async () => {
  let calls = 0
  const access = createSessionAccess({ getSession: async () => result(), refreshSession: async () => {
    calls++
    if (calls === 1) return result(null, { code: 'request_timeout', status: 504 })
    return result({ ...session, access_token: 'synthetic-recovered' })
  } }, () => 1000)
  await assert.rejects(access(true), error => error.code === 'request_timeout')
  assert.equal(await access(true), 'synthetic-recovered')
  assert.equal(calls, 2)
})
