'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import {
  History,
  Calendar,
  Trash2,
  PlusCircle,
  Search,
  RefreshCw,
  Eye,
  DollarSign,
  Tag,
  Package,
  Wallet
} from 'lucide-react'

interface AuditLogProps {
  user: User
}

interface AuditEntry {
  id: string
  action: string
  expense_id: string | null
  user_id: string
  details: any
  created_at: string
}

export default function AuditLog({ user }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (user.role === 'admin') {
      loadUsers()
      loadAuditLogs()
    }
  }, [user.role])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
      
      if (error) throw error
      
      const userMap: Record<string, string> = {}
      data?.forEach(u => {
        userMap[u.id] = u.name
      })
      setUsers(userMap)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
      toast.error('Gagal memuat riwayat')
    } finally {
      setLoading(false)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const userName = users[log.user_id] || ''
    const searchContent = [
      userName,
      log.details?.description,
      log.details?.itemName,
      log.details?.category,
      log.details?.cashier_source
    ].filter(Boolean).join(' ').toLowerCase()
    
    return searchTerm === '' || searchContent.includes(searchTerm.toLowerCase())
  })

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'CREATE': return <PlusCircle className="w-4 h-4 text-green-500" />
      case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />
      default: return <History className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionText = (action: string) => {
    switch(action) {
      case 'CREATE': return 'menambahkan'
      case 'DELETE': return 'menghapus'
      default: return action
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // If user is not admin, don't show anything
  if (user.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5" />
              Riwayat Aktivitas
            </h2>
            <button
              onClick={() => {
                loadUsers()
                loadAuditLogs()
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari user, item, atau kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-600" />
            Memuat riwayat...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-400 mb-1">Belum ada riwayat</p>
            <p className="text-sm">Aktivitas akan muncul di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLogs.map((log) => {
              const details = log.details || {}
              const itemName = details.itemName || details.description || ''
              const amount = details.amount
              const category = details.category
              const unit = details.unit
              const cashSource = details.cashier_source

              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Action Icon */}
                    <div className="mt-0.5">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top line: User + Action + Item */}
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {users[log.user_id] || 'Unknown User'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          log.action === 'CREATE' 
                            ? 'text-green-600 bg-green-50' 
                            : 'text-red-600 bg-red-50'
                        }`}>
                          {getActionText(log.action)}
                        </span>
                        {itemName && (
                          <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {itemName}
                          </span>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                        {amount && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                        )}
                        {category && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Tag className="w-3 h-3 text-gray-400" />
                            <span>{category}</span>
                          </div>
                        )}
                        {unit && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Package className="w-3 h-3 text-gray-400" />
                            <span>Satuan: {unit}</span>
                          </div>
                        )}
                        {cashSource && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Wallet className="w-3 h-3 text-gray-400" />
                            <span>Kas: {cashSource}</span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(log.created_at)}
                      </div>

                      {/* Expandable Full Details */}
                      {details && Object.keys(details).length > 0 && (
                        <>
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-2"
                          >
                            <Eye className="w-3 h-3" />
                            {expandedId === log.id ? 'Sembunyikan detail' : 'Lihat semua detail'}
                          </button>

                          {expandedId === log.id && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                              <pre className="whitespace-pre-wrap font-mono text-gray-700">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Menampilkan {filteredLogs.length} dari {logs.length} riwayat
          </p>
        </div>
      </div>
    </div>
  )
}