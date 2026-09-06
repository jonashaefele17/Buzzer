import { supabase } from './supabaseClient'

// Supabase Auth requires an email; the host only ever types a username, so we
// translate it to a fixed synthetic address under the hood.
const EMAIL_DOMAIN = 'buzzer.local'

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export async function signInHost(username: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase ist nicht konfiguriert.'
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  return error ? 'Benutzername oder Passwort ist falsch.' : null
}

export async function signOutHost(): Promise<void> {
  await supabase?.auth.signOut()
}
