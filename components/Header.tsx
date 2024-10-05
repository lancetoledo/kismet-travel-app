// File: /components/Header.tsx

'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FiMap } from 'react-icons/fi' // Importing an icon from react-icons

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <header className="h-20 flex w-full p-[30px] text-lg font-bold items-center justify-between bg-white dark:bg-gray-800">
      {/* Logo Section */}
      <div className="flex justify-center h-full max-w-screen-xl px-4">
        <Link href="/" className="text-2xl font-bold text-green-500 dark:text-green-400 flex items-center">
          <FiMap className="mr-2" size={24} /> {/* Icon next to logo */}
          Kismet
        </Link>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex justify-center items-center gap-[20px]">
        <Link 
          href="/your-map" 
          className="text-black dark:text-gray-200 hover:text-green-500 transition-colors duration-200 flex items-center"
        >
          Your Map
        </Link>
        
        {['Favourites', 'Friends'].map((item) => (
          <div key={item} className="relative mr-1 cursor-pointer">
            <Link 
              href={`/${item.toLowerCase().replace(' ', '-')}`} 
              className="flex mx-[10px] text-black dark:text-gray-200 hover:text-green-500 transition-colors duration-200"
            >
              {item}
            </Link>
          </div>
        ))}
        
        {session ? (
          <>
            <Link 
              href="/profile"
              className="flex mx-[10px] text-black dark:text-gray-200 hover:text-green-500 transition-colors duration-200"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex mx-[10px] bg-orange-500 dark:bg-orange-600 w-20 h-10 text-white justify-center items-center hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors duration-200"
            >
              Logout
            </button>
          </>
        ) : (
          <Link 
            href="/login"
            className="flex mx-[10px] bg-orange-500 dark:bg-orange-600 w-20 h-10 text-white justify-center items-center hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors duration-200"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  )
}
