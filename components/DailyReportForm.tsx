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
  AlertCircle,
  Wallet,
  Landmark,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [kasirExpenses, setKasirExpenses] = useState(0)
  const [kasExpenses, setKasExpenses] = useState(0)
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingData, setPendingData] = useState<any>(null)

  // Load data when date changes
  useEffect(() => {
    loadExpenses()
    checkExistingReport()
  }, [date])

  const loadExpenses = async () => {
    try {
      // Load expenses from KASIR (cash drawer)
      const { data: kasirData, error: kasirError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', date)
        .eq('cashier_source', 'Kasir')

      if (kasirError) throw kasirError
      
      const kasirTotal = (kasirData || []).reduce((sum, exp) => sum + exp.amount, 0)
      setKasirExpenses(kasirTotal)

      // Load expenses from KAS (main safe)
      const { data: kasData, error: kasError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', date)
        .eq('cashier_source', 'Kas')

      if (kasError) throw kasError
      
      const kasTotal = (kasData || []).reduce((sum, exp) => sum + exp.amount, 0)
      setKasExpenses(kasTotal)

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

    // Calculate summary for confirmation
    const cash = parseFloat(cashAmount) || 0
    const gofood = parseFloat(gofoodAmount) || 0
    const shopee = parseFloat(shopeeAmount) || 0
    const qris = parseFloat(qrisAmount) || 0
    const other = parseFloat(otherDigitalAmount) || 0
    const pos = parseFloat(posTotal) || 0

    const totalDigital = gofood + shopee + qris + other
    const cashIncome = pos - totalDigital
    const expectedCash = cashIncome - kasirExpenses
    const cashDifference = cash - expectedCash

    // Show confirmation modal
    setPendingData({
      cash, gofood, shopee, qris, other, pos,
      totalDigital, cashIncome, expectedCash, cashDifference,
      notes
    })
    setShowConfirmModal(true)
  }

  const confirmSave = async () => {
    if (!pendingData) return
    
    setLoading(true)
    setShowConfirmModal(false)

    try {
      const { cash, gofood, shopee, qris, other, pos, notes } = pendingData

      const reportData = {
        date,
        cash_amount: cash,
        gofood_amount: gofood,
        shopee_amount: shopee,
        qris_amount: qris,
        other_digital_amount: other,
        pos_total: pos,
        kasir_expenses: kasirExpenses,
        kas_expenses: kasExpenses,
        notes
      }

      if (existingReport) {
        // Update existing report
        const { error } = await supabase
          .from('daily_reports')
          .update(reportData)
          .eq('id', existingReport.id)

        if (error) throw error
        toast.success('Laporan harian diperbarui!')
      } else {
        // Insert new report
        const { error } = await supabase
          .from('daily_reports')
          .insert([{
            ...reportData,
            created_by: user.id
          }])

        if (error) throw error
        toast.success('Laporan harian disimpan!')
      }

      // Show cash difference result
      const { cashDifference } = pendingData
      if (cashDifference > 0) {
        toast.success(`💰 Kelebihan di laci: Rp ${formatCurrency(Math.abs(cashDifference))}`)
      } else if (cashDifference < 0) {
        toast.error(`💸 Kekurangan di laci: Rp ${formatCurrency(Math.abs(cashDifference))}`)
      } else {
        toast.success('✅ Uang di laci pas!')
      }

      onReportSubmitted?.()
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Gagal menyimpan laporan')
    } finally {
      setLoading(false)
      setPendingData(null)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value)
  }

  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    const raw = value.replace(/[^\d]/g, '')
    setter(raw)
  }

  // Calculate values for display
  const cash = parseFloat(cashAmount) || 0
  const gofood = parseFloat(gofoodAmount) || 0
  const shopee = parseFloat(shopeeAmount) || 0
  const qris = parseFloat(qrisAmount) || 0
  const other = parseFloat(otherDigitalAmount) || 0
  const pos = parseFloat(posTotal) || 0
  
  const totalDigital = gofood + shopee + qris + other
  const cashIncome = pos - totalDigital
  const expectedCash = cashIncome - kasirExpenses
  const cashDifference = cash - expectedCash
  const differenceColor = cashDifference > 0 ? 'text-green-600' : cashDifference < 0 ? 'text-red-600' : 'text-gray-600'

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

          {/* Cash Drawer Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Wallet className="w-4 h-4 text-green-600" />
              Uang Tunai di Laci (KASIR) *
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

          {/* Expense Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
              <div className="flex items-center gap-1 text-sm text-orange-700 dark:text-orange-300 mb-1">
                <Wallet className="w-4 h-4" />
                Expense KASIR
              </div>
              <div className="font-semibold text-orange-700 dark:text-orange-300">
                Rp {formatCurrency(kasirExpenses)}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
              <div className="flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 mb-1">
                <Landmark className="w-4 h-4" />
                Expense KAS
              </div>
              <div className="font-semibold text-blue-700 dark:text-blue-300">
                Rp {formatCurrency(kasExpenses)}
              </div>
            </div>
          </div>

          {/* Cash Drawer Calculation */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
            <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              Perhitungan Laci Kas (KASIR)
            </h3>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Omset POS:</span>
              <span className="font-medium">Rp {formatCurrency(pos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Pembayaran Digital:</span>
              <span className="font-medium text-blue-600">- Rp {formatCurrency(totalDigital)}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-200 dark:border-gray-600 pb-2">
              <span className="text-gray-600 dark:text-gray-400">Uang Tunai Masuk:</span>
              <span className="font-medium">Rp {formatCurrency(cashIncome)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expense KASIR:</span>
              <span className="font-medium text-red-600">- Rp {formatCurrency(kasirExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-200 dark:border-gray-600 pb-2">
              <span className="text-gray-600 dark:text-gray-400">Seharusnya di Laci:</span>
              <span className="font-medium">Rp {formatCurrency(expectedCash)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Aktual di Laci:</span>
              <span className="font-medium">Rp {formatCurrency(cash)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Selisih Laci:
              </span>
              <span className={differenceColor}>
                {cashDifference > 0 ? '+' : ''}{cashDifference !== 0 ? `Rp ${formatCurrency(Math.abs(cashDifference))}` : 'Rp 0'}
                {cashDifference > 0 ? ' (Kelebihan)' : cashDifference < 0 ? ' (Kekurangan)' : ''}
              </span>
            </div>
          </div>

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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && pendingData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Konfirmasi Laporan
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tanggal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(date).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Omset:</span>
                  <span className="font-medium">Rp {formatCurrency(pendingData.pos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Digital:</span>
                  <span className="font-medium">Rp {formatCurrency(pendingData.totalDigital)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Uang Tunai Masuk:</span>
                  <span className="font-medium">Rp {formatCurrency(pendingData.cashIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Expense KASIR:</span>
                  <span className="font-medium text-red-600">- Rp {formatCurrency(kasirExpenses)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Seharusnya di Laci:</span>
                  <span className="font-medium">Rp {formatCurrency(pendingData.expectedCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Uang Aktual:</span>
                  <span className="font-medium">Rp {formatCurrency(pendingData.cash)}</span>
                </div>
                <div className={`flex justify-between text-sm font-bold ${differenceColor}`}>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Selisih:
                  </span>
                  <span>
                    {pendingData.cashDifference > 0 ? '+' : ''}
                    Rp {formatCurrency(Math.abs(pendingData.cashDifference))}
                    {pendingData.cashDifference > 0 ? ' (Kelebihan)' : pendingData.cashDifference < 0 ? ' (Kekurangan)' : ''}
                  </span>
                </div>
                {pendingData.notes && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    📝 {pendingData.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Batal
                </button>
                <button
                  onClick={confirmSave}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Konfirmasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}