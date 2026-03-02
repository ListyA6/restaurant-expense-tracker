'use client'

import { useState, useEffect } from 'react'
import LoginScreen from '@/components/LoginScreen'
import ExpenseForm from '@/components/ExpenseForm'
import ExpenseList from '@/components/ExpenseList'
import AdminDashboard from '@/components/AdminDashboard'
import AuditLog from '@/components/AuditLog'
import ExportButtons from '@/components/ExportButtons'
import DailyReportForm from '@/components/DailyReportForm'
import ThemeToggle from '@/components/ThemeToggle'
import { User } from '@/types'
import { LayoutDashboard, ListTodo, History, Download, FileText } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'audit' | 'export' | 'daily'>('form')

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setUser(null)
  }

  const handleExpenseAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleReportSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Restaurant Expense Tracker
          </h1>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.name} {user.role === 'admin' && '👑'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Different for admin vs cashier */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-0.5">
            {/* Daily Report Tab - Available to EVERYONE (admin and cashiers) */}
            <button
              onClick={() => setActiveTab('daily')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                ${activeTab === 'daily'
                  ? 'border-green-600 text-green-600 dark:text-green-400 dark:border-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <FileText className="w-4 h-4" />
              Laporan Harian
            </button>

            {/* Admin-only tabs */}
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                    ${activeTab === 'form'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <ListTodo className="w-4 h-4" />
                  Input Pengeluaran
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                    ${activeTab === 'dashboard'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                    ${activeTab === 'audit'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <History className="w-4 h-4" />
                  Riwayat Aktivitas
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                    ${activeTab === 'export'
                      ? 'border-green-600 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-4">
        {activeTab === 'daily' && (
          <DailyReportForm 
            user={user} 
            onReportSubmitted={handleReportSubmitted}
          />
        )}

        {user.role === 'admin' && (
          <>
            {activeTab === 'form' && (
              <>
                <ExpenseForm user={user} onExpenseAdded={handleExpenseAdded} />
                <ExpenseList key={refreshKey} user={user} />
              </>
            )}
            {activeTab === 'dashboard' && (
              <AdminDashboard user={user} />
            )}
            {activeTab === 'audit' && (
              <AuditLog user={user} />
            )}
            {activeTab === 'export' && (
              <div className="max-w-4xl mx-auto p-4">
                <ExportButtons />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}