'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { LogIn, Lock, User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginScreenProps {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setShowPassword(true)
    setPassword('')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) return

    try {
      // In a real app, you'd verify against hashed password
      // For now, we'll check against the plain text (temporary)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedUser.id)
        .eq('password', password)
        .single()

      if (error || !data) {
        toast.error('Password salah!')
        return
      }

      // Password correct - login
      localStorage.setItem('currentUser', JSON.stringify(selectedUser))
      onLogin(selectedUser)
      toast.success(`Selamat datang, ${selectedUser.name}!`)
    } catch (error) {
      toast.error('Login gagal')
    }
  }

  const handleBack = () => {
    setSelectedUser(null)
    setShowPassword(false)
    setPassword('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
          >
            Restaurant Expense Tracker
          </motion.h1>
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 dark:text-gray-400"
          >
            {!showPassword ? 'Pilih user untuk login' : `Masukkan password untuk ${selectedUser?.name}`}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!showPassword ? (
            /* User Selection Grid */
            <motion.div
              key="user-grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-2 gap-4"
            >
              {users.map((user) => (
                <motion.button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-blue-500 group"
                >
                  <div className="flex flex-col items-center space-y-3">
                    {/* Avatar circle with initial */}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-white">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    
                    {/* User name */}
                    <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                    
                    {/* Role badge */}
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            /* Password Input */
            <motion.div
              key="password-input"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Selected user info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">
                      {selectedUser?.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedUser?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedUser?.role === 'admin' ? 'Administrator' : 'Kasir'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Ganti
                  </button>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!password}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          {!showPassword ? 'Pilih user untuk melanjutkan' : 'Masukkan password untuk login'}
        </motion.p>
      </div>
    </div>
  )
}