import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_RESTAURANT!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_RESTAURANT!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)