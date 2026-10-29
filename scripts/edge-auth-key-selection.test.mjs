import assert from 'node:assert/strict'
import test from 'node:test'

function selectPublicKey(values) {
  try {
    const mapping = JSON.parse(values.SUPABASE_PUBLISHABLE_KEYS || '{}')
    if (typeof mapping.default === 'string' && mapping.default.trim())
      return { value: mapping.default, source: 'publishable_keys_default' }
  } catch { /* same safe fallback as the Edge helper */ }
  if (values.SUPABASE_PUBLISHABLE_KEY)
    return { value: values.SUPABASE_PUBLISHABLE_KEY, source: 'publishable_key' }
  if (values.SUPABASE_ANON_KEY)
    return { value: values.SUPABASE_ANON_KEY, source: 'legacy_anon' }
  return { value: '', source: 'missing' }
}

const allowedCodes = new Set(['bad_jwt', 'session_not_found', 'user_not_found', 'invalid_credentials'])
const safeCode = (error) => allowedCodes.has(error?.code) ? error.code : 'UNKNOWN'
const safeStatus = (error) => Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null

test('default publishable key wins over direct and legacy keys', () => {
  const selected = selectPublicKey({
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'synthetic-default' }),
    SUPABASE_PUBLISHABLE_KEY: 'synthetic-direct', SUPABASE_ANON_KEY: 'synthetic-legacy',
  })
  assert.equal(selected.source, 'publishable_keys_default')
  assert.equal(selected.value, 'synthetic-default')
})

test('direct publishable and legacy anon are ordered fallbacks', () => {
  assert.equal(selectPublicKey({ SUPABASE_PUBLISHABLE_KEY: 'synthetic-direct', SUPABASE_ANON_KEY: 'synthetic-legacy' }).source, 'publishable_key')
  assert.equal(selectPublicKey({ SUPABASE_PUBLISHABLE_KEYS: 'invalid-json', SUPABASE_ANON_KEY: 'synthetic-legacy' }).source, 'legacy_anon')
  assert.equal(selectPublicKey({}).source, 'missing')
})

test('diagnostics expose only allowlisted code and valid status', () => {
  assert.equal(safeCode({ code: 'bad_jwt', message: 'sensitive' }), 'bad_jwt')
  assert.equal(safeCode({ code: 'unexpected_secret', message: 'sensitive' }), 'UNKNOWN')
  assert.equal(safeStatus({ status: 401 }), 401)
  assert.equal(safeStatus({ status: 999 }), null)
  assert.equal(safeStatus(null), null)
})
