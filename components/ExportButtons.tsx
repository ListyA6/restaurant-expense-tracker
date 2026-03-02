'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Download, FileText, FileSpreadsheet, Calendar, DollarSign, TrendingUp, PieChart } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ExportButtonsProps {
  userId?: string
}

export default function ExportButtons({ userId }: ExportButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState<'expenses' | 'sales' | 'monthly'>('expenses')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          user:users(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Gagal mengambil data pengeluaran')
      return []
    }
  }

  const fetchSalesReports = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          user:users(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching sales reports:', error)
      toast.error('Gagal mengambil data penjualan')
      return []
    }
  }

  const fetchMonthlySummary = async () => {
    try {
      // Get the month from startDate
      const [year, month] = startDate.split('-')
      const firstDay = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

      // Fetch all daily reports for the month
      const { data: reports, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: true })

      if (reportsError) throw reportsError

      // Fetch all expenses for the month
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', firstDay)
        .lte('date', lastDay)

      if (expensesError) throw expensesError

      // Calculate totals
      const totalSales = reports?.reduce((sum, r) => sum + (r.pos_total || 0), 0) || 0
      const totalDigital = reports?.reduce((sum, r) => 
        sum + (r.gofood_amount || 0) + (r.shopee_amount || 0) + 
        (r.qris_amount || 0) + (r.other_digital_amount || 0), 0) || 0
      const totalCash = reports?.reduce((sum, r) => sum + (r.cash_amount || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
      const kasirExpenses = expenses?.filter(e => e.cashier_source === 'Kasir')
        .reduce((sum, e) => sum + e.amount, 0) || 0
      const kasExpenses = expenses?.filter(e => e.cashier_source === 'Kas')
        .reduce((sum, e) => sum + e.amount, 0) || 0

      // Calculate cash differences
      let totalDifference = 0
      reports?.forEach(r => {
        const digital = (r.gofood_amount || 0) + (r.shopee_amount || 0) + 
                       (r.qris_amount || 0) + (r.other_digital_amount || 0)
        const expected = (r.pos_total || 0) - digital - (r.kasir_expenses || 0)
        const diff = (r.cash_amount || 0) - expected
        totalDifference += diff
      })

      return {
        month: `${month}/${year}`,
        days: reports?.length || 0,
        totalSales,
        totalDigital,
        totalCash,
        totalExpenses,
        kasirExpenses,
        kasExpenses,
        averageSales: reports?.length ? totalSales / reports.length : 0,
        averageExpenses: reports?.length ? totalExpenses / reports.length : 0,
        cashDifference: totalDifference,
        reports: reports || [],
        expenses: expenses || []
      }
    } catch (error) {
      console.error('Error fetching monthly summary:', error)
      toast.error('Gagal mengambil ringkasan bulanan')
      return null
    }
  }

  const exportToCSV = async () => {
    setLoading(true)
    try {
      let data: any[] = []
      let filename = ''
      let headers: string[] = []

      if (reportType === 'expenses') {
        data = await fetchExpenses()
        if (data.length === 0) {
          toast.error('Tidak ada data pengeluaran untuk diekspor')
          return
        }
        headers = ['Tanggal', 'Item', 'Kategori', 'Jumlah', 'Satuan', 'Sumber Kas', 'User', 'Dibuat']
        filename = `pengeluaran_${startDate}_to_${endDate}.csv`
      } 
      else if (reportType === 'sales') {
        data = await fetchSalesReports()
        if (data.length === 0) {
          toast.error('Tidak ada data penjualan untuk diekspor')
          return
        }
        headers = ['Tanggal', 'Omset', 'Tunai', 'GoFood', 'Shopee', 'QRIS', 'Lainnya', 
                   'Expense KASIR', 'Expense KAS', 'Selisih', 'Catatan', 'User']
        filename = `penjualan_${startDate}_to_${endDate}.csv`
      }
      else if (reportType === 'monthly') {
        const summary = await fetchMonthlySummary()
        if (!summary) return

        // Create monthly summary CSV
        const monthlyRows = [
          ['Ringkasan Bulanan', summary.month],
          ['Total Hari', summary.days.toString()],
          ['Total Omset', `Rp ${new Intl.NumberFormat('id-ID').format(summary.totalSales)}`],
          ['Total Digital', `Rp ${new Intl.NumberFormat('id-ID').format(summary.totalDigital)}`],
          ['Total Tunai', `Rp ${new Intl.NumberFormat('id-ID').format(summary.totalCash)}`],
          ['Total Pengeluaran', `Rp ${new Intl.NumberFormat('id-ID').format(summary.totalExpenses)}`],
          ['- dari KASIR', `Rp ${new Intl.NumberFormat('id-ID').format(summary.kasirExpenses)}`],
          ['- dari KAS', `Rp ${new Intl.NumberFormat('id-ID').format(summary.kasExpenses)}`],
          ['Rata-rata Omset/Hari', `Rp ${new Intl.NumberFormat('id-ID').format(summary.averageSales)}`],
          ['Rata-rata Expense/Hari', `Rp ${new Intl.NumberFormat('id-ID').format(summary.averageExpenses)}`],
          ['Selisih Kas Bulanan', `Rp ${new Intl.NumberFormat('id-ID').format(summary.cashDifference)}`],
          [],
          ['Detail Harian:'],
          ['Tanggal', 'Omset', 'Tunai', 'Digital', 'Expense KASIR', 'Selisih']
        ]

        // Add daily details
        summary.reports.forEach(report => {
          const digital = (report.gofood_amount || 0) + (report.shopee_amount || 0) + 
                         (report.qris_amount || 0) + (report.other_digital_amount || 0)
          const expected = (report.pos_total || 0) - digital - (report.kasir_expenses || 0)
          const diff = (report.cash_amount || 0) - expected
          
          monthlyRows.push([
            report.date,
            `Rp ${new Intl.NumberFormat('id-ID').format(report.pos_total || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(report.cash_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(digital)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(report.kasir_expenses || 0)}`,
            diff > 0 ? `+${new Intl.NumberFormat('id-ID').format(diff)}` : 
            diff < 0 ? `-${new Intl.NumberFormat('id-ID').format(Math.abs(diff))}` : '0'
          ])
        })

        const csvContent = monthlyRows.map(row => 
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `ringkasan_bulanan_${startDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success(`Berhasil mengekspor ringkasan bulanan`)
        setLoading(false)
        return
      }

      // For expenses and sales, create regular CSV
      const rows = data.map(item => {
        if (reportType === 'expenses') {
          return [
            format(new Date(item.date), 'dd/MM/yyyy'),
            item.description || '-',
            item.category,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.amount)}`,
            item.unit || '-',
            item.cashier_source,
            item.user?.name || '-',
            format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')
          ]
        } else {
          const digital = (item.gofood_amount || 0) + (item.shopee_amount || 0) + 
                         (item.qris_amount || 0) + (item.other_digital_amount || 0)
          const expected = (item.pos_total || 0) - digital - (item.kasir_expenses || 0)
          const diff = (item.cash_amount || 0) - expected
          const diffText = diff > 0 ? `+${new Intl.NumberFormat('id-ID').format(diff)}` : 
                          diff < 0 ? `-${new Intl.NumberFormat('id-ID').format(Math.abs(diff))}` : '0'
          
          return [
            item.date,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.pos_total || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.cash_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.gofood_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.shopee_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.qris_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.other_digital_amount || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.kasir_expenses || 0)}`,
            `Rp ${new Intl.NumberFormat('id-ID').format(item.kas_expenses || 0)}`,
            diffText,
            item.notes || '-',
            item.user?.name || '-'
          ]
        }
      })

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Berhasil mengekspor ${data.length} data`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Gagal mengekspor data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Report Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setReportType('expenses')}
            className={`p-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1
              ${reportType === 'expenses'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
          >
            <FileText className="w-4 h-4" />
            Pengeluaran
          </button>
          <button
            onClick={() => setReportType('sales')}
            className={`p-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1
              ${reportType === 'sales'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            Penjualan
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`p-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1
              ${reportType === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
          >
            <PieChart className="w-4 h-4" />
            Bulanan
          </button>
        </div>

        {/* Date Range Selection */}
        <div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Calendar className="w-4 h-4" />
            {showDatePicker ? 'Sembunyikan' : 'Pilih'} Rentang Tanggal
          </button>

          {showDatePicker && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {reportType === 'monthly' ? 'Bulan' : 'Dari'}
                </label>
                <input
                  type={reportType === 'monthly' ? 'month' : 'date'}
                  value={reportType === 'monthly' ? startDate.slice(0, 7) : startDate}
                  onChange={(e) => {
                    if (reportType === 'monthly') {
                      setStartDate(e.target.value + '-01')
                    } else {
                      setStartDate(e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                />
              </div>
              {reportType !== 'monthly' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sampai</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={exportToCSV}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {loading ? 'Mengekspor...' : `Export ${reportType === 'expenses' ? 'Pengeluaran' : reportType === 'sales' ? 'Penjualan' : 'Ringkasan Bulanan'}`}
        </button>

        {/* Quick Periods - Only show for non-monthly */}
        {reportType !== 'monthly' && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setStartDate(firstDay.toISOString().split('T')[0])
                setEndDate(today.toISOString().split('T')[0])
              }}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                setStartDate(lastMonth.toISOString().split('T')[0])
                setEndDate(lastMonthEnd.toISOString().split('T')[0])
              }}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), 0, 1)
                setStartDate(firstDay.toISOString().split('T')[0])
                setEndDate(today.toISOString().split('T')[0])
              }}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Tahun Ini
            </button>
          </div>
        )}
      </div>
    </div>
  )
}