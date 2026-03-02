'use client'

import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', color = 'blue' }: { size?: 'sm' | 'md' | 'lg', color?: 'blue' | 'purple' | 'green' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorMap = {
    blue: 'border-blue-600',
    purple: 'border-purple-600',
    green: 'border-green-600'
  }

  return (
    <div className="flex justify-center items-center">
      <motion.div
        className={`${sizeMap[size]} border-4 border-gray-200 ${colorMap[color]} rounded-full border-t-transparent`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}