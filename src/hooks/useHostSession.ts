import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

/**
 * Tracks the host's Supabase Auth session. Returns 'local' when Supabase isn't
 * configured at all (local dev store), so the host view stays open without login.
 */
export function useHostSession(): Session | null | 'loading' | 'local' {
  const [session, setSession] = useState<Session | null | 'loading'>('loading')

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return 'local'
  return session
}
