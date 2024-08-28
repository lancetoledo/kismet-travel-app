'use client'

import { SessionProvider } from 'next-auth/react'
import { AppProps } from 'next/app'
import '../styles/globals.css'

export default function RootLayout({ children }: AppProps) {
  return (
    <SessionProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </SessionProvider>
  )
}