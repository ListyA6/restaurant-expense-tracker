import { supabase } from './supabase'

export async function logAction(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  expenseId: string | null,
  userId: string,
  details: any = {}
) {
  try {
    console.log('📝 Attempting to log:', { action, expenseId, userId })

    // Ultra simple insert - no details
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action: action,
        expense_id: expenseId,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('❌ Insert error:', error)
    } else {
      console.log('✅ Insert success:', data)
    }
  } catch (error) {
    console.error('❌ Exception:', error)
  }
}