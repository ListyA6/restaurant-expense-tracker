'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { toast } from 'react-hot-toast'
import { LogIn } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleLogin = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user))
    onLogin(user)
    toast.success(`Welcome back, ${user.name}!`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Restaurant Expense Tracker
          </h1>
          <p className="text-gray-600">Select your name to continue</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user)}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-blue-500 group"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-semibold text-white">
                    {user.name.charAt(0)}
                  </span>
                </div>
                
                <span className="font-medium text-gray-900">{user.name}</span>
                
                <span className={`text-xs px-3 py-1 rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                </span>

                <LogIn className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Choose your name to login • Admin can add new users
        </p>
      </div>
    </div>
  )
}