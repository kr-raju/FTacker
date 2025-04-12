import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from './auth-provider'

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

// Initialize the database
async function initDatabase() {
  // Only run in browser (client-side)
  if (typeof window !== 'undefined') {
    try {
      // Call the API route to run migration
      const response = await fetch('/api/migrate');
      if (!response.ok) {
        console.error('Database migration failed:', await response.text());
      } else {
        console.log('Database migration completed successfully');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
}

// Call the initialization function
if (typeof window !== 'undefined') {
  initDatabase();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 