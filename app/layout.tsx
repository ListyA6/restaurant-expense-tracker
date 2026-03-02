import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restaurant Expense Tracker',
  description: 'Track your restaurant expenses with smart categorization',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Warung Tracker',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#1f2937',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                padding: '12px 20px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                icon: '✅',
                style: {
                  borderLeft: '4px solid #10b981',
                },
              },
              error: {
                icon: '❌',
                style: {
                  borderLeft: '4px solid #ef4444',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}