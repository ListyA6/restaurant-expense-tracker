'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ExportButtonsProps {
  userId?: string // Optional: filter by user
}

export default function ExportButtons({ userId }: ExportButtonsProps) {
  const [loading, setLoading] = useState(false)
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
      toast.error('Gagal mengambil data')
      return []
    }
  }

  const exportToCSV = async () => {
    setLoading(true)
    try {
      const expenses = await fetchExpenses()
      
      if (expenses.length === 0) {
        toast.error('Tidak ada data untuk diekspor')
        return
      }

      // Prepare CSV headers
      const headers = ['Tanggal', 'Item', 'Kategori', 'Jumlah', 'Satuan', 'Kas', 'User', 'Dibuat']
      
      // Prepare CSV rows
      const rows = expenses.map(exp => [
        format(new Date(exp.date), 'dd/MM/yyyy'),
        exp.description || '-',
        exp.category,
        `Rp ${new Intl.NumberFormat('id-ID').format(exp.amount)}`,
        exp.unit || '-',
        exp.cashier_source,
        exp.user?.name || '-',
        format(new Date(exp.created_at), 'dd/MM/yyyy HH:mm')
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `expenses_${startDate}_to_${endDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Berhasil mengekspor ${expenses.length} data`)
    } catch (error) {
      toast.error('Gagal mengekspor CSV')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
  setLoading(true)
  try {
    const expenses = await fetchExpenses()
    
    if (expenses.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    // Calculate total
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Create PDF
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.setTextColor(59, 130, 246)
    doc.text('Laporan Pengeluaran', 14, 22)
    
    // Date range
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Periode: ${format(new Date(startDate), 'dd MMMM yyyy', { locale: id })} - ${format(new Date(endDate), 'dd MMMM yyyy', { locale: id })}`,
      14,
      32
    )
    
    // Total
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Pengeluaran: Rp ${new Intl.NumberFormat('id-ID').format(total)}`, 14, 42)

    // Table
    autoTable(doc, {
      startY: 50,
      head: [['Tanggal', 'Item', 'Kategori', 'Jumlah', 'Kas', 'User']],
      body: expenses.map(exp => [
        format(new Date(exp.date), 'dd/MM/yyyy'),
        exp.description || '-',
        exp.category,
        `Rp ${new Intl.NumberFormat('id-ID').format(exp.amount)}`,
        exp.cashier_source,
        exp.user?.name || '-'
      ]),
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      },
      // Add footer with page numbers
      didDrawPage: function(data) {
        // Footer
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Dibuat: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Halaman ${data.pageNumber}`,
          14,
          doc.internal.pageSize.height - 10
        )
      }
    })

    // Download PDF
    doc.save(`laporan_pengeluaran_${startDate}_to_${endDate}.pdf`)
    
    toast.success(`Berhasil mengekspor ${expenses.length} data`)
  } catch (error) {
    console.error('PDF Error:', error)
    toast.error('Gagal mengekspor PDF')
  } finally {
    setLoading(false)
  }
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
                  Dari
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Sampai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportToCSV}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {loading ? '...' : 'CSV'}
          </button>
          <button
            onClick={exportToPDF}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" />
            {loading ? '...' : 'PDF'}
          </button>
        </div>

        {/* Quick Periods */}
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
      </div>
    </div>
  )
}