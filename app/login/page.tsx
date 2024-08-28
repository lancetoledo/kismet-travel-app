'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (session) {
      router.push('/')
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle email/password login
    console.log('Login attempt with:', email, password)
  }

  const handleGoogleLogin = async () => {
    const result = await signIn('google', { callbackUrl: '/', redirect: false })
    if (result?.ok) {
      router.push('/')
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (session) {
    return null // This will prevent the login page from rendering while redirecting
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-8 flex justify-center items-center h-[calc(100vh-5rem)]">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-6 text-green-500">Login to Kismet</h2>
          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="******************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
              >
                Sign In
              </button>
              <a className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-800" href="#">
                Forgot Password?
              </a>
            </div>
          </form>
          <div className="text-center">
            <button
              onClick={handleGoogleLogin}
              className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}