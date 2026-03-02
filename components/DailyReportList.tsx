'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { 
  Calendar,
  Search,
  Eye,
  DollarSign,
  Smartphone,
  ShoppingBag,
  QrCode,
  MoreHorizontal,
  FileText,
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'

interface DailyReportListProps {
  user: User
}

interface DailyReport {
  id: string
  date: string
  cash_amount: number
  gofood_amount: number
  shopee_amount: number
  qris_amount: number
  other_digital_amount: number
  pos_total: number
  kasir_expenses?: number
  kas_expenses?: number
  expected_cash?: number
  cash_difference?: number
  notes: string | null
  created_at: string
  user?: {
    name: string
  }
}

export default function DailyReportList({ user }: DailyReportListProps) {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (user.role === 'admin') {
      loadReports()
    }
  }, [selectedMonth, user.role])

  const loadReports = async () => {
    setLoading(true)
    try {
      const startDate = `${selectedMonth}-01`
      const endDate = new Date(selectedMonth + '-01')
      endDate.setMonth(endDate.getMonth() + 1)
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          user:users(name)
        `)
        .gte('date', startDate)
        .lt('date', endDateStr)
        .order('date', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Gagal memuat laporan harian')
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const searchContent = [
      report.date,
      report.notes || '',
      report.user?.name || ''
    ].join(' ').toLowerCase()
    return searchTerm === '' || searchContent.includes(searchTerm.toLowerCase())
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount)
  }

  const calculateDigitalTotal = (report: DailyReport) => {
    return (report.gofood_amount || 0) + (report.shopee_amount || 0) + 
           (report.qris_amount || 0) + (report.other_digital_amount || 0)
  }

  // If user is not admin, don't show anything
  if (user.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Riwayat Laporan Harian
          </h2>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari laporan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Tidak ada laporan untuk bulan ini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredReports.map((report) => {
              const digitalTotal = calculateDigitalTotal(report)
              const kasirExpenses = report.kasir_expenses || 0
              const kasExpenses = report.kas_expenses || 0
              const expectedCash = report.expected_cash || 0
              const cashDifference = report.cash_difference || 0
              const differenceColor = cashDifference > 0 ? 'text-green-600' : cashDifference < 0 ? 'text-red-600' : 'text-gray-600'

              return (
                <div key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(report.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                      <div className="text-xs text-blue-600 dark:text-blue-400">Omset</div>
                      <div className="font-semibold text-sm">Rp {formatCurrency(report.pos_total)}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                      <div className="text-xs text-green-600 dark:text-green-400">Digital</div>
                      <div className="font-semibold text-sm">Rp {formatCurrency(digitalTotal)}</div>
                    </div>
                    <div className={`p-2 rounded-lg ${
                      cashDifference > 0 ? 'bg-green-50 dark:bg-green-900/20' : 
                      cashDifference < 0 ? 'bg-red-50 dark:bg-red-900/20' : 
                      'bg-gray-50 dark:bg-gray-700'
                    }`}>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Selisih</div>
                      <div className={`font-semibold text-sm ${differenceColor}`}>
                        {cashDifference > 0 ? '+' : ''}{cashDifference !== 0 ? `Rp ${formatCurrency(Math.abs(cashDifference))}` : 'Rp 0'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === report.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                      {/* Cash Drawer Section */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <Wallet className="w-4 h-4" />
                          Laci Kas (KASIR)
                        </h4>
                        <div className="space-y-2 pl-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Uang Tunai di Laci:</span>
                            <span className="font-medium">Rp {formatCurrency(report.cash_amount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Expense dari KASIR:</span>
                            <span className="font-medium text-red-600">- Rp {formatCurrency(kasirExpenses)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="text-gray-600 dark:text-gray-400">Seharusnya di Laci:</span>
                            <span className="font-medium">Rp {formatCurrency(expectedCash)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Selisih Laci:
                            </span>
                            <span className={differenceColor}>
                              {cashDifference > 0 ? '+' : ''}{cashDifference !== 0 ? `Rp ${formatCurrency(Math.abs(cashDifference))}` : 'Rp 0'}
                              {cashDifference > 0 ? ' (Kelebihan)' : cashDifference < 0 ? ' (Kekurangan)' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Digital Payments */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <Smartphone className="w-4 h-4" />
                          Pembayaran Digital
                        </h4>
                        <div className="space-y-2 pl-2">
                          {report.gofood_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">GoFood:</span>
                              <span>Rp {formatCurrency(report.gofood_amount)}</span>
                            </div>
                          )}
                          {report.shopee_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Shopee:</span>
                              <span>Rp {formatCurrency(report.shopee_amount)}</span>
                            </div>
                          )}
                          {report.qris_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">QRIS:</span>
                              <span>Rp {formatCurrency(report.qris_amount)}</span>
                            </div>
                          )}
                          {report.other_digital_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Lainnya:</span>
                              <span>Rp {formatCurrency(report.other_digital_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Total Digital:</span>
                            <span className="font-medium">Rp {formatCurrency(digitalTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Safe Section */}
                      {kasExpenses > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Landmark className="w-4 h-4" />
                            Brankas (KAS)
                          </h4>
                          <div className="pl-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Expense dari KAS:</span>
                              <span className="font-medium">Rp {formatCurrency(kasExpenses)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {report.notes && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            📝 {report.notes}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-gray-400 dark:text-gray-500 flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Dibuat oleh: {report.user?.name || 'Unknown'}</span>
                        <span>{new Date(report.created_at).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}