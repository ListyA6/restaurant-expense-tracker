'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart,
  Smartphone,
  ShoppingBag,
  QrCode,
  MoreHorizontal,
  Wallet,
  Landmark,
  AlertCircle,
  Target,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, Line, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts'

interface AdminDashboardProps {
  user: User
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [latestReport, setLatestReport] = useState<any>(null)
  const [qrisData, setQrisData] = useState({
    weekly: 0,
    monthly: 0,
    target: 10000000,
    daily: [] as { date: string; amount: number }[]
  })
  const [trendData, setTrendData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])

  useEffect(() => {
    if (user.role === 'admin') {
      loadDashboardData()
    }
  }, [user.role])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Get today's date
      const today = new Date()

      // Load the latest daily report
      const { data: reportData, error: reportError } = await supabase
        .from('daily_reports')
        .select('*, user:users(name)')
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (reportError && reportError.code !== 'PGRST116') throw reportError
      setLatestReport(reportData)

      // Load QRIS data for last 30 days
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: qrisReports, error: qrisError } = await supabase
        .from('daily_reports')
        .select('date, qris_amount')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (qrisError) throw qrisError

      // Calculate weekly and monthly QRIS
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      let weeklyTotal = 0
      let monthlyTotal = 0
      const qrisDaily: { date: string; amount: number }[] = []

      qrisReports?.forEach(report => {
        const reportDate = new Date(report.date)
        if (reportDate >= weekAgo) {
          weeklyTotal += report.qris_amount || 0
        }
        monthlyTotal += report.qris_amount || 0
        qrisDaily.push({
          date: report.date,
          amount: report.qris_amount || 0
        })
      })

      // Get target from settings (or use default)
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'qris_target')
        .maybeSingle()

      const target = settings?.value?.amount || 10000000

      setQrisData({
        weekly: weeklyTotal,
        monthly: monthlyTotal,
        target,
        daily: qrisDaily.slice(-7) // Last 7 days
      })

      // Load trend data (last 7 days omset)
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: trendReports } = await supabase
        .from('daily_reports')
        .select('date, pos_total')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .order('date', { ascending: true })

      const trend = trendReports?.map(r => ({
        date: new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short' }),
        omset: r.pos_total || 0,
        fullDate: r.date
      })) || []
      setTrendData(trend)

      // Load category data for current month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('category, amount')
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0])

      if (expensesError) throw expensesError

      const categories = expenses?.reduce((acc: any[], exp) => {
        const existing = acc.find(item => item.name === exp.category)
        if (existing) {
          existing.value += exp.amount
        } else {
          acc.push({
            name: exp.category,
            value: exp.amount
          })
        }
        return acc
      }, []) || []

      setCategoryData(categories)

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
    }).format(amount).replace('Rp', 'Rp ')
  }

  const calculateProgress = () => {
    return Math.min(Math.round((qrisData.monthly / qrisData.target) * 100), 100)
  }

  const targetProgress = calculateProgress()

  if (user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-green-600" />
          <p className="text-gray-500">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  const reportDate = latestReport?.date 
    ? new Date(latestReport.date).toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Belum ada laporan'

  const digitalTotal = latestReport 
    ? (latestReport.gofood_amount || 0) + (latestReport.shopee_amount || 0) + 
      (latestReport.qris_amount || 0) + (latestReport.other_digital_amount || 0)
    : 0

  const cashIncome = latestReport 
    ? (latestReport.pos_total || 0) - digitalTotal
    : 0

  const expectedCash = latestReport
    ? cashIncome - (latestReport.kasir_expenses || 0)
    : 0

  const cashDifference = latestReport
    ? (latestReport.cash_amount || 0) - expectedCash
    : 0

  const differenceColor = cashDifference > 0 ? 'text-green-600' : cashDifference < 0 ? 'text-red-600' : 'text-gray-600'

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart className="w-6 h-6 text-green-600" />
          Dashboard Keuangan
        </h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Today's Recap Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Rekap Harian Terakhir {latestReport ? `(${reportDate})` : ''}
          </h3>
        </div>
        
        {latestReport ? (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column - Income */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">💰 Omset</span>
                  <span className="font-semibold text-lg">{formatCurrency(latestReport.pos_total)}</span>
                </div>
                <div className="pl-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> GoFood
                    </span>
                    <span>{formatCurrency(latestReport.gofood_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" /> Shopee
                    </span>
                    <span>{formatCurrency(latestReport.shopee_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <QrCode className="w-3 h-3" /> QRIS
                    </span>
                    <span>{formatCurrency(latestReport.qris_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MoreHorizontal className="w-3 h-3" /> Lainnya
                    </span>
                    <span>{formatCurrency(latestReport.other_digital_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-gray-200 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Digital</span>
                    <span className="text-blue-600">{formatCurrency(digitalTotal)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 dark:text-gray-400">💵 Tunai Masuk</span>
                  <span className="font-semibold">{formatCurrency(cashIncome)}</span>
                </div>
              </div>

              {/* Right Column - Cash Drawer */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Wallet className="w-4 h-4" /> Expense KASIR
                  </span>
                  <span className="font-semibold text-red-600">- {formatCurrency(latestReport.kasir_expenses || 0)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">✅ Seharusnya di Laci</span>
                  <span className="font-semibold">{formatCurrency(expectedCash)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Uang Ada di Laci
                  </span>
                  <span className="font-semibold">{formatCurrency(latestReport.cash_amount)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-4 h-4" /> SELISIH
                  </span>
                  <span className={`font-bold text-lg ${differenceColor}`}>
                    {cashDifference > 0 ? '+' : ''}{formatCurrency(cashDifference)}
                    {cashDifference > 0 ? ' (Kelebihan)' : cashDifference < 0 ? ' (Kekurangan)' : ''}
                  </span>
                </div>

                {latestReport.kas_expenses > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Landmark className="w-4 h-4" /> Expense KAS
                      </span>
                      <span className="font-medium">{formatCurrency(latestReport.kas_expenses)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {latestReport.notes && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  📝 {latestReport.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada laporan</p>
          </div>
        )}
      </div>

      {/* QRIS Tracker and Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* QRIS Tracker Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QRIS Tracker
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">📱 Minggu Ini</span>
                <span className="font-semibold text-lg text-purple-600">
                  {formatCurrency(qrisData.weekly)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">📊 Bulan Ini</span>
                <span className="font-semibold text-lg text-purple-600">
                  {formatCurrency(qrisData.monthly)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trend Omset 7 Hari
            </h3>
          </div>
          <div className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line 
                    type="monotone" 
                    dataKey="omset" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top Expenses by Category */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Top Pengeluaran Bulan Ini
          </h3>
        </div>
        <div className="p-4">
          {categoryData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const percentage = percent ? (percent * 100).toFixed(0) : '0'
                    return `${name} ${percentage}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

              {/* List */}
              <div className="space-y-3">
                {categoryData.map((cat, index) => {
                  const total = categoryData.reduce((sum, c) => sum + c.value, 0)
                  const percentage = ((cat.value / total) * 100).toFixed(1)
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                        <span className="font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{percentage}%</span>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(categoryData.reduce((sum, c) => sum + c.value, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada data pengeluaran bulan ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}