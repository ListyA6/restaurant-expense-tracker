import { createClient } from '@supabase/supabase-js'

// TEMPORARY DEBUG LOGS - Remove after testing
console.log('🔍 Debug: Checking environment variables')
console.log('URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
console.log('URL value:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Present' : '❌ Missing')
console.log('Key value:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)