// Single point of import for the active GameStore implementation.
// Uses Supabase when VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set (see .env.example),
// otherwise falls back to the local-only store for dev/testing without a Supabase project.
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { gameStore as localGameStore } from './LocalGameStore'
import { gameStore as supabaseGameStore } from './SupabaseGameStore'

export const gameStore = isSupabaseConfigured ? supabaseGameStore : localGameStore
