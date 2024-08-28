'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <header className="h-20 flex w-full p-[30px] text-lg font-bold items-center justify-between">
      <div className="flex justify-center h-full max-w-screen-xl px-4">
        <Link href="/" className="text-2xl font-bold text-green-500">
          Kismet
        </Link>
      </div>
      <nav className="flex justify-center items-center gap-[20px]">
        <Link href="/your-map" className="text-black hover:text-green-500 transition-colors duration-200">
          Your Map
        </Link>
        {['Favourites', 'Friends'].map((item) => (
          <div key={item} className="relative mr-1 cursor-pointer">
            <Link 
              href={`/${item.toLowerCase().replace(' ', '-')}`} 
              className="flex mx-[10px] text-black hover:text-green-500 transition-colors duration-200"
            >
              {item}
            </Link>
          </div>
        ))}
        {session ? (
          <>
            <Link 
              href="/profile"
              className="flex mx-[10px] text-black hover:text-green-500 transition-colors duration-200"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex mx-[10px] bg-orange-500 w-20 h-10 text-white justify-center items-center hover:bg-orange-600 transition-colors duration-200"
            >
              Logout
            </button>
          </>
        ) : (
          <Link 
            href="/login"
            className="flex mx-[10px] bg-orange-500 w-20 h-10 text-white justify-center items-center hover:bg-orange-600 transition-colors duration-200"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  )
}