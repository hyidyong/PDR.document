import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해 주세요.')
}

const projectRef = new URL(url).hostname.split('.')[0]
const globalScope = globalThis as typeof globalThis & { __moditSupabase?: SupabaseClient }

// Keep one auth client across React Fast Refresh. Multiple clients can race while rotating
// the same persisted refresh token.
export const supabase = globalScope.__moditSupabase ??= createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: `sb-${projectRef}-auth-token`,
  },
})
