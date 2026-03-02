export interface User {
  id: string
  name: string
  role: 'admin' | 'user'
  created_at: string
}

export interface Expense {
  id: string
  amount: number
  category: 'Bahan Baku' | 'Operasional' | 'Gaji Karyawan' | 'Marketing' | 'Other'
  description: string | null
  date: string
  cashier_source: string
  user_id: string
  user?: User
  created_at: string
}

export interface AuditLog {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  expense_id: string
  user_id: string
  user?: User
  details: any
  created_at: string
}export interface User {
  id: string
  name: string
  role: 'admin' | 'user'
  created_at: string
}

export interface Expense {
  id: string
  amount: number
  category: 'Bahan Baku' | 'Operasional' | 'Gaji Karyawan' | 'Marketing' | 'Other'
  description: string | null
  quantity?: string | null  // Added this
  unit?: string | null      // Added this
  date: string
  cashier_source: string
  user_id: string
  user?: User
  created_at: string
}

export interface AuditLog {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  expense_id: string
  user_id: string
  user?: User
  details: any
  created_at: string
}
export interface DailyReport {
  id: string
  date: string
  cash_amount: number
  gofood_amount: number
  shopee_amount: number
  qris_amount: number
  other_digital_amount: number
  pos_total: number
  notes: string | null
  created_by: string
  created_at: string
  user?: {
    name: string
  }
}