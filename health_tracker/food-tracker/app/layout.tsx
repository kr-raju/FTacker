import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

// Initialize the Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Food Tracker',
  description: 'Track your daily food intake and monitor your nutrition goals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  )
} 