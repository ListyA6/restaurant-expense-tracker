'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { logAction } from '@/lib/audit'
import { 
  Calendar,
  Filter,
  Search,
  Trash2,
  Coffee,
  Wifi,
  Users,
  Megaphone,
  MoreHorizontal
} from 'lucide-react'

interface ExpenseListProps {
  user: User
}

type FilterPeriod = 'today' | 'week' | 'month' | 'all'

// Define Expense type locally to avoid import issues
interface Expense {
  id: string
  amount: number
  category: string
  description: string | null
  date: string
  cashier_source: string
  user_id: string
  unit: string | null
  user?: {
    name: string
    role: string
  }
}

export default function ExpenseList({ user }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [totalAmount, setTotalAmount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (user.role === 'admin') {
      loadExpenses()
    }
  }, [filterPeriod, user.role])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          user:users(name, role)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply date filter
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      if (filterPeriod === 'today') {
        query = query.eq('date', today)
      } else if (filterPeriod === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]
        query = query.gte('date', weekAgo)
      } else if (filterPeriod === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0]
        query = query.gte('date', monthAgo)
      }

      const { data, error } = await query

      if (error) throw error

      setExpenses(data || [])
      
      // Calculate total
      const total = (data || []).reduce((sum, exp) => sum + exp.amount, 0)
      setTotalAmount(total)
    } catch (error) {
      console.error('Error loading expenses:', error)
      toast.error('Gagal memuat pengeluaran')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (expenseId: string) => {
  if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return

  setDeletingId(expenseId)
  try {
    // FIRST: Get complete expense details before deleting
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (fetchError) throw fetchError

    // SECOND: Delete the expense
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (deleteError) throw deleteError

    // THIRD: Log the deletion with ALL details
    if (expense) {
      await logAction('DELETE', expenseId, user.id, {
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        unit: expense.unit || '',
        cashier_source: expense.cashier_source,
        date: expense.date,
        itemName: expense.description, // Add this for consistency
        deletedAt: new Date().toISOString()
      })
    }

    toast.success('Pengeluaran dihapus')
    loadExpenses()
  } catch (error: any) {
    console.error('Delete error:', error)
    toast.error(error.message || 'Gagal menghapus')
  } finally {
    setDeletingId(null)
  }
}

  // Filter by search and category
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchTerm === '' || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories for filter
  const categories = ['all', ...new Set(expenses.map(e => e.category))]

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Bahan Baku': return <Coffee className="w-4 h-4 text-orange-500" />
      case 'Operasional': return <Wifi className="w-4 h-4 text-blue-500" />
      case 'Gaji Karyawan': return <Users className="w-4 h-4 text-green-500" />
      case 'Marketing': return <Megaphone className="w-4 h-4 text-purple-500" />
      default: return <MoreHorizontal className="w-4 h-4 text-gray-500" />
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // If user is not admin, don't show anything
  if (user.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header with Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Daftar Pengeluaran
            </h2>
            <div className="text-white">
              <span className="text-sm opacity-90">Total: </span>
              <span className="font-bold">Rp {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${filterPeriod === 'today' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${filterPeriod === 'week' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              1 Minggu
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${filterPeriod === 'month' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              1 Bulan
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${filterPeriod === 'all' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari pengeluaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="px-4 pb-4 flex items-center gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Expenses List */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Memuat...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Tidak ada pengeluaran
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  {/* Left side - Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(expense.category)}
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {expense.category}
                      </span>
                      {expense.unit && (
                        <span className="text-xs text-gray-400">
                          {expense.unit}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-1 break-words">
                      {expense.description || 'Tanpa keterangan'}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(expense.date)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {expense.user?.name || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>Kas: {expense.cashier_source}</span>
                    </div>
                  </div>

                  {/* Right side - Amount and Delete */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      Rp {formatCurrency(expense.amount)}
                    </span>
                    
                    {/* Delete button - Admin only */}
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer with count */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Menampilkan {filteredExpenses.length} dari {expenses.length} pengeluaran
          </p>
        </div>
      </div>
    </div>
  )
}