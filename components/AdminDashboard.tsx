'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Download,
  RefreshCw
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'

interface AdminDashboardProps {
  user: User
}

type Period = 'day' | 'week' | 'month' | 'year'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('week')
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    highest: 0,
    lowest: 0,
    count: 0
  })
  const [previousPeriodTotal, setPreviousPeriodTotal] = useState(0)

  useEffect(() => {
    if (user.role === 'admin') {
      loadDashboardData()
    }
  }, [period, user.role])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Get date ranges
      const now = new Date()
      let startDate: Date
      let previousStartDate: Date

      switch (period) {
        case 'day':
          startDate = subDays(now, 1)
          previousStartDate = subDays(now, 2)
          break
        case 'week':
          startDate = subWeeks(now, 1)
          previousStartDate = subWeeks(now, 2)
          break
        case 'month':
          startDate = subMonths(now, 1)
          previousStartDate = subMonths(now, 2)
          break
        case 'year':
          startDate = subMonths(now, 12)
          previousStartDate = subMonths(now, 24)
          break
      }

      // Load current period expenses
      const { data: currentExpenses, error: currentError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (currentError) throw currentError

      // Load previous period expenses for comparison
      const { data: previousExpenses, error: previousError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', previousStartDate.toISOString().split('T')[0])
        .lt('date', startDate.toISOString().split('T')[0])

      if (previousError) throw previousError

      // Calculate statistics
      const amounts = currentExpenses?.map(e => e.amount) || []
      const total = amounts.reduce((sum, amt) => sum + amt, 0)
      const previousTotal = previousExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0

      setStats({
        total,
        average: amounts.length > 0 ? total / amounts.length : 0,
        highest: Math.max(...amounts, 0),
        lowest: Math.min(...amounts, 0),
        count: amounts.length
      })

      setPreviousPeriodTotal(previousTotal)

      // Prepare trend data
      const trend = currentExpenses?.reduce((acc: any[], expense) => {
        const date = expense.date
        const existing = acc.find(item => item.date === date)
        if (existing) {
          existing.total += expense.amount
        } else {
          acc.push({
            date,
            total: expense.amount,
            formattedDate: format(new Date(date), 'dd MMM', { locale: id })
          })
        }
        return acc
      }, []) || []

      setTrendData(trend)

      // Prepare category data
      const categories = currentExpenses?.reduce((acc: any[], expense) => {
        const existing = acc.find(item => item.name === expense.category)
        if (existing) {
          existing.value += expense.amount
        } else {
          acc.push({
            name: expense.category,
            value: expense.amount
          })
        }
        return acc
      }, []) || []

      setCategoryData(categories)

      // Prepare daily/weekly data for bar chart
      if (period === 'day') {
        // Group by hour
        const hourly = currentExpenses?.reduce((acc: any[], expense) => {
          const hour = new Date(expense.created_at).getHours()
          const hourLabel = `${hour}:00`
          const existing = acc.find(item => item.hour === hourLabel)
          if (existing) {
            existing.amount += expense.amount
          } else {
            acc.push({
              hour: hourLabel,
              amount: expense.amount
            })
          }
          return acc
        }, []) || []
        setExpenseData(hourly)
      } else {
        // Group by day
        const daily = currentExpenses?.reduce((acc: any[], expense) => {
          const date = expense.date
          const existing = acc.find(item => item.date === date)
          if (existing) {
            existing.amount += expense.amount
          } else {
            acc.push({
              date,
              amount: expense.amount,
              formattedDate: format(new Date(date), 'dd MMM', { locale: id })
            })
          }
          return acc
        }, []) || []
        setExpenseData(daily)
      }

    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Gagal memuat dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const calculateChange = () => {
    if (previousPeriodTotal === 0) return { percentage: 0, direction: 'up' }
    const change = ((stats.total - previousPeriodTotal) / previousPeriodTotal) * 100
    return {
      percentage: Math.abs(change).toFixed(1),
      direction: change >= 0 ? 'up' : 'down'
    }
  }

  const change = calculateChange()

  // If user is not admin, don't show anything
  if (user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          Memuat dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChartIcon className="w-6 h-6 text-blue-600" />
          Dashboard Keuangan
        </h2>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {p === 'day' ? 'Hari' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Tahun'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.total)}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            {change.direction === 'up' ? (
              <TrendingUp className="w-3 h-3 text-red-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-500" />
            )}
            <span className={change.direction === 'up' ? 'text-red-500' : 'text-green-500'}>
              {change.percentage}%
            </span>
            <span className="text-gray-400">vs periode sebelumnya</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Rata-rata</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.average)}</div>
          <div className="text-xs text-gray-400 mt-1">Per transaksi</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Tertinggi</span>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.highest)}</div>
          <div className="text-xs text-gray-400 mt-1">1 transaksi</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Terendah</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.lowest)}</div>
          <div className="text-xs text-gray-400 mt-1">1 transaksi</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Jumlah Transaksi</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.count}</div>
          <div className="text-xs text-gray-400 mt-1">Kali</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Line Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Trend Pengeluaran</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Pengeluaran per Kategori</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {period === 'day' ? 'Pengeluaran per Jam' : 'Pengeluaran per Hari'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={period === 'day' ? 'hour' : 'formattedDate'} 
                />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Jumlah" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Ringkasan</h3>
        <p className="text-sm text-gray-600">
          Total {stats.count} transaksi dengan total {formatCurrency(stats.total)}.
          Rata-rata {formatCurrency(stats.average)} per transaksi.
          {change.direction === 'up' 
            ? ` Naik ${change.percentage}% dari periode sebelumnya.`
            : ` Turun ${change.percentage}% dari periode sebelumnya.`
          }
        </p>
      </div>
    </div>
  )
}