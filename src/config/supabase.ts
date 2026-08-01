import { createClient } from '@supabase/supabase-js'

// These are PUBLIC by design (the publishable/anon key is safe in client code —
// data is protected by Row Level Security). Never put the secret/service_role key here.
// An env var can override them for a different project.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://kesqzfztokvrsskraeih.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_htZAS05-sJ2Dsx6Q78ckHQ_Xz7Pe8jh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
