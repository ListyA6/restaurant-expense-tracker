'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { 
  DollarSign, 
  Smartphone, 
  ShoppingBag, 
  QrCode, 
  MoreHorizontal,
  Calculator,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react'

interface DailyReportFormProps {
  user: User
  onReportSubmitted?: () => void
}

export default function DailyReportForm({ user, onReportSubmitted }: DailyReportFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [cashAmount, setCashAmount] = useState('')
  const [gofoodAmount, setGofoodAmount] = useState('')
  const [shopeeAmount, setShopeeAmount] = useState('')
  const [qrisAmount, setQrisAmount] = useState('')
  const [otherDigitalAmount, setOtherDigitalAmount] = useState('')
  const [posTotal, setPosTotal] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingReport, setExistingReport] = useState<any>(null)
  const [todayExpenses, setTodayExpenses] = useState(0)

  // Load today's expenses for reference
  useEffect(() => {
    loadTodayExpenses()
    checkExistingReport()
  }, [date])

  const loadTodayExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', date)

      if (error) throw error
      
      const total = (data || []).reduce((sum, exp) => sum + exp.amount, 0)
      setTodayExpenses(total)
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const checkExistingReport = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setExistingReport(data)
        setCashAmount(data.cash_amount.toString())
        setGofoodAmount(data.gofood_amount.toString())
        setShopeeAmount(data.shopee_amount.toString())
        setQrisAmount(data.qris_amount.toString())
        setOtherDigitalAmount(data.other_digital_amount.toString())
        setPosTotal(data.pos_total.toString())
        setNotes(data.notes || '')
      } else {
        setExistingReport(null)
      }
    } catch (error) {
      console.error('Error checking report:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cashAmount || !posTotal) {
      toast.error('Uang tunai dan total POS harus diisi!')
      return
    }

    setLoading(true)

    try {
      const cash = parseFloat(cashAmount) || 0
      const gofood = parseFloat(gofoodAmount) || 0
      const shopee = parseFloat(shopeeAmount) || 0
      const qris = parseFloat(qrisAmount) || 0
      const other = parseFloat(otherDigitalAmount) || 0
      const pos = parseFloat(posTotal) || 0

      const totalDigital = gofood + shopee + qris + other
      const totalSeharusnya = cash + totalDigital
      const selisih = totalSeharusnya - pos

      if (existingReport) {
        // Update existing report
        const { error } = await supabase
          .from('daily_reports')
          .update({
            cash_amount: cash,
            gofood_amount: gofood,
            shopee_amount: shopee,
            qris_amount: qris,
            other_digital_amount: other,
            pos_total: pos,
            notes
          })
          .eq('id', existingReport.id)

        if (error) throw error
        toast.success('Laporan harian diperbarui!')
      } else {
        // Insert new report
        const { error } = await supabase
          .from('daily_reports')
          .insert([{
            date,
            cash_amount: cash,
            gofood_amount: gofood,
            shopee_amount: shopee,
            qris_amount: qris,
            other_digital_amount: other,
            pos_total: pos,
            notes,
            created_by: user.id
          }])

        if (error) throw error
        toast.success('Laporan harian disimpan!')
      }

      // Show selisih info
      if (selisih > 0) {
        toast.success(`💰 Kelebihan: Rp ${formatCurrency(selisih)}`)
      } else if (selisih < 0) {
        toast.error(`💸 Kekurangan: Rp ${formatCurrency(Math.abs(selisih))}`)
      } else {
        toast.success('✅ Pas! Tidak ada selisih')
      }

      onReportSubmitted?.()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan laporan')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value)
  }

  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    const raw = value.replace(/[^\d]/g, '')
    setter(raw)
  }

  // Calculate digital total and selisih
  const cash = parseFloat(cashAmount) || 0
  const gofood = parseFloat(gofoodAmount) || 0
  const shopee = parseFloat(shopeeAmount) || 0
  const qris = parseFloat(qrisAmount) || 0
  const other = parseFloat(otherDigitalAmount) || 0
  const pos = parseFloat(posTotal) || 0
  
  const totalDigital = gofood + shopee + qris + other
  const totalSeharusnya = cash + totalDigital
  const selisih = totalSeharusnya - pos
  const selisihColor = selisih > 0 ? 'text-green-600' : selisih < 0 ? 'text-red-600' : 'text-gray-600'

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Laporan Harian
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date - Admin can edit, cashier can't */}
          {user.role === 'admin' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
              />
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Tanggal: {new Date(date).toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}

          {/* Today's Expenses (for reference) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">Total Pengeluaran Hari Ini:</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                Rp {formatCurrency(todayExpenses)}
              </span>
            </div>
          </div>

          {/* Cash Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              Uang Tunai di Kas *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="text"
                value={cashAmount ? formatCurrency(parseFloat(cashAmount)) : ''}
                onChange={(e) => handleNumberInput(e.target.value, setCashAmount)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Digital Payments */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Smartphone className="w-4 h-4 text-blue-600" />
              Pembayaran Digital
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">GoFood</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={gofoodAmount ? formatCurrency(parseFloat(gofoodAmount)) : ''}
                    onChange={(e) => handleNumberInput(e.target.value, setGofoodAmount)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <ShoppingBag className="w-3 h-3 inline mr-1" />
                  Shopee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={shopeeAmount ? formatCurrency(parseFloat(shopeeAmount)) : ''}
                    onChange={(e) => handleNumberInput(e.target.value, setShopeeAmount)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <QrCode className="w-3 h-3 inline mr-1" />
                  QRIS
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={qrisAmount ? formatCurrency(parseFloat(qrisAmount)) : ''}
                    onChange={(e) => handleNumberInput(e.target.value, setQrisAmount)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <MoreHorizontal className="w-3 h-3 inline mr-1" />
                  Lainnya
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={otherDigitalAmount ? formatCurrency(parseFloat(otherDigitalAmount)) : ''}
                    onChange={(e) => handleNumberInput(e.target.value, setOtherDigitalAmount)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* POS Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Calculator className="w-4 h-4 text-purple-600" />
              Total Omset (dari POS) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="text"
                value={posTotal ? formatCurrency(parseFloat(posTotal)) : ''}
                onChange={(e) => handleNumberInput(e.target.value, setPosTotal)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Calculation Summary */}
          {(cashAmount || gofoodAmount || shopeeAmount || qrisAmount || otherDigitalAmount || posTotal) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Digital:</span>
                <span className="font-medium">Rp {formatCurrency(totalDigital)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tunai + Digital:</span>
                <span className="font-medium">Rp {formatCurrency(totalSeharusnya)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Selisih:
                </span>
                <span className={selisihColor}>
                  {selisih > 0 ? '+' : ''}{selisih !== 0 ? `Rp ${formatCurrency(Math.abs(selisih))}` : 'Rp 0'}
                  {selisih > 0 && ' (Kelebihan)'}
                  {selisih < 0 && ' (Kekurangan)'}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kelebihan karena ada uang kembalian, dll..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : existingReport ? 'Perbarui Laporan' : 'Simpan Laporan'}
          </button>

          {existingReport && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400">
              Laporan untuk tanggal ini sudah ada. Anda dapat memperbaruinya.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}