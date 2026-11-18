import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase: SupabaseClient = supabaseConfigurado
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient)

export function exigirSupabase() {
  if (!supabaseConfigurado) {
    throw new Error('Supabase não configurado. Preencha o arquivo .env.')
  }
  return supabase
}
