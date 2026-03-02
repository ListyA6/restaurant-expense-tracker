'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { logAction } from '@/lib/audit'
import { 
  PlusCircle, 
  Coffee, 
  Wifi, 
  Users, 
  Megaphone, 
  MoreHorizontal,
  Calendar,
  Wallet,
  FileText,
  Sparkles,
  Package,
  Scale,
  Droplets,
  Box,
  Layers
} from 'lucide-react'

interface ExpenseFormProps {
  user: User
  onExpenseAdded: () => void
}

// Smart category detection based on your actual purchases
const categoryKeywords = {
  'Bahan Baku': [
    // Sayuran & Bumbu
    'gobis', 'timun', 'cabe rawit', 'cabe caplak', 'cabe japlak', 'bawang putih', 'bawang putih kupas',
    'jeruk peras', 'jeruk nipis', 'jeruk nipis', 'jeruk lemon', 'kentang', 'ayam', 'lele', 'telur',
    'beras', 'gula', 'kopi', 'teh', 'teh 999', 'teh tongji', 'teh dandang biru', 'teh gopek', 'teh poci',
    'teh nyapu', 'teh sintren', 'garam', 'merica', 'lada', 'ketumbar', 'jinten', 'ajinomoto', 'nikuplus',
    'sasa kaldu sapi', 'ajinomoto plus', 'ajinomoto chicken powder', 'paprika powder', 'onion powder',
    'garlic powder', 'minyak', 'minyak kita', 'minyak (jurigen)', 'saos tomat', 'saos sambal',
    'saos tomat kg\'an', 'saos sachet', 'saos tomat sachet', 'saos sambal sachet', 'baking soda',
    'tepung terigu', 'tepung maizena', 'tepung tapioka', 'es batu', 'air galon', 'air mineral',
    'air mineral (le)', 'konsumsi'
  ],
  
  'Operasional': [
    // Utilitas & Sewa
    'kontrakan', 'parkir', 'parkir mbak nuk', 'iuran rt', 'bayar sampah', 'token listrik', 'listrik',
    'gas lpg', 'wifi', 'bensin', 'tambal ban', 'perbaikan wastafel',
    
    // Alat Tulis & Cetak
    'kertas print', 'print buku pengeluaran', 'print bw text', 'ball point', 'alat tulis',
    
    // Peralatan Dapur
    'cup 12 oz', 'cup 22 oz', 'cup sealer', 'mrc 24', 'mrc 28', 'sterofoam bubur', 'sterofoam besar',
    'plastik', 'plastik sambal', 'plastik 1/2 kg\'an', 'plastik 1 kg\'an', 'kresek merah', 'kresek pk 24',
    'paper bag', 'sedotan', 'sendok plastik', 'tissue', 'kertas minyak', 'karet gelang',
    
    // Alat Kebersihan
    'sabun cuci piring', 'sabun cuci tangan', 'sabun lantai', 'kawat cuci piring', 'spons cuci piring',
    'sikat', 'pembersih kaca', 'kain lap', 'masker', 'hit serangga', 'ctm',
    
    // Peralatan Lain
    'gunting', 'isi cutter', 'cutter', 'double tape', 'lem g', 'lem fox', 'selang', 'lampu',
    'tempat sampah', 'entong', 'irus', 'alat perbaikan', 'mantel plastik',
    
    // Ongkos Kirim
    'upah kirim hujan', 'upah kuli tepung', 'nyelep'
  ],
  
  'Gaji Karyawan': [
    'gaji', 'bonus', 'upah'
  ],
  
  'Marketing': [
    'diskon', 'iklan', 'promo'
  ]
}

// Unit types with icons
const unitTypes = [
  { id: 'kg', label: 'Kg', icon: Scale },
  { id: 'gr', label: 'Gr', icon: Scale },
  { id: 'pcs', label: 'Pcs', icon: Package },
  { id: 'bal', label: 'Bal', icon: Layers },
  { id: 'dus', label: 'Dus', icon: Box },
  { id: 'jirigen', label: 'Jirigen', icon: Droplets },
  { id: 'pack', label: 'Pack', icon: Package },
  { id: 'ikat', label: 'Ikat', icon: Package },
  { id: 'bungkus', label: 'Bungkus', icon: Package },
  { id: 'sak', label: 'Sak (Karung)', icon: Package }  // Added sak/karung
]

export default function ExpenseForm({ user, onExpenseAdded }: ExpenseFormProps) {
  const [itemName, setItemName] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [detectedCategory, setDetectedCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [cashSource, setCashSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{name: string, unit: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load past item names for suggestions
  useEffect(() => {
    if (itemName.length > 1) {
      loadSuggestions()
    } else {
      setShowSuggestions(false)
    }
  }, [itemName])

  // Smart category detection when item name changes
  useEffect(() => {
    if (itemName.length > 0) {
      const category = detectCategory(itemName)
      setDetectedCategory(category)
    } else {
      setDetectedCategory('')
    }
  }, [itemName])

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('description, unit')
        .ilike('description', `%${itemName}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      
      // Filter out null/undefined and remove duplicates
      const validData = data?.filter(item => item.description != null) || []
      const uniqueSuggestions = validData.reduce((acc: any[], current) => {
        if (!acc.find(item => item.description === current.description)) {
          acc.push({ name: current.description, unit: current.unit || '' })
        }
        return acc
      }, [])
      
      setSuggestions(uniqueSuggestions)
      setShowSuggestions(uniqueSuggestions.length > 0)
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  // Smart category detection function
  const detectCategory = (text: string): string => {
    const lowercaseText = text.toLowerCase()
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowercaseText.includes(keyword.toLowerCase())) {
          return category
        }
      }
    }
    
    return 'Other'
  }

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!itemName || !totalPrice || !cashSource) {
    toast.error('Isi nama item, total harga, dan sumber uang!')
    return
  }

  setLoading(true)

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          amount: parseFloat(totalPrice),
          category: detectedCategory || 'Other',
          description: itemName,
          unit: unit || null,
          date: user.role === 'admin' ? date : new Date().toISOString().split('T')[0],
          cashier_source: cashSource === 'kas' ? 'Kas' : 'Kasir',
          user_id: user.id
        }
      ])
      .select()  // This line is important - it returns the inserted data

    if (error) throw error

    // Log the action - THIS IS THE NEW PART
    if (data && data[0]) {
      await logAction('CREATE', data[0].id, user.id, {
        itemName,
        amount: totalPrice,
        category: detectedCategory,
        unit,
        cashSource,
        date: data[0].date
      })
    }

    toast.success(`✅ ${itemName} ditambahkan sebagai ${detectedCategory || 'Other'}!`)
    
    // Reset form
    setItemName('')
    setTotalPrice('')
    setUnit('')
    setDetectedCategory('')
    setDate(new Date().toISOString().split('T')[0])
    setCashSource('')
    
    onExpenseAdded()
  } catch (error: any) {
    toast.error(error.message || 'Gagal menambah expense')
  } finally {
    setLoading(false)
  }
}

  // Format amount as Rupiah
  const formatRupiah = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return new Intl.NumberFormat('id-ID').format(Number(number))
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    setTotalPrice(raw)
  }

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

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Tambah Pengeluaran
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Item Name with Smart Detection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Nama Item / Keterangan *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Contoh: mbas sawit"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
                autoFocus
              />
            </div>
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                {suggestions.map((sug, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl text-gray-900"
                    onClick={() => {
                      setItemName(sug.name)
                      if (sug.unit) setUnit(sug.unit)
                      setShowSuggestions(false)
                    }}
                  >
                    {sug.name} {sug.unit && <span className="text-gray-400 text-sm">({sug.unit})</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Detected Category Badge */}
            {detectedCategory && (
              <div className="mt-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">Terdeteksi sebagai:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {getCategoryIcon(detectedCategory)}
                  {detectedCategory}
                </span>
              </div>
            )}
          </div>

          {/* Unit Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Satuan
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
            >
              <option value="">Pilih satuan</option>
              {unitTypes.map((u) => {
                const Icon = u.icon
                return (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Total Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Total Harga (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="text"
                value={totalPrice ? formatRupiah(totalPrice) : ''}
                onChange={handlePriceChange}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg text-gray-900 placeholder-gray-400"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Cash Source */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Uang Dari Mana? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCashSource('kas')}
                className={`
                  flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-gray-900
                  ${cashSource === 'kas' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Wallet className={`w-5 h-5 ${cashSource === 'kas' ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className="font-medium">Kas</span>
              </button>
              <button
                type="button"
                onClick={() => setCashSource('kasir')}
                className={`
                  flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-gray-900
                  ${cashSource === 'kasir' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Users className={`w-5 h-5 ${cashSource === 'kasir' ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className="font-medium">Kasir</span>
              </button>
            </div>
          </div>

          {/* Date Picker - Only visible for Admin */}
          {user.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tanggal *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-4 rounded-xl font-semibold text-white
              ${loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }
              transition-colors
            `}
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
          </button>

          {/* Smart detection info */}
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Diteliti lagi bang biar ga salah
          </p>
        </form>
      </div>
    </div>
  )
}