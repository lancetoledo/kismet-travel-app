import Link from 'next/link'

export default function Header() {
  return (
    <header className="h-20 flex w-full p-[30px] text-lg font-bold items-center justify-between">
      <div className="flex justify-center h-full max-w-screen-xl px-4">
        <Link href="/" className="text-2xl font-bold text-green-500">
          Kismet
        </Link>
      </div>
      <nav className="flex justify-center items-center gap-[20px]">
        {['Profile', 'Your Map', 'Favourites', 'Friends'].map((item) => (
          <div key={item} className="relative mr-1 cursor-pointer">
            <Link 
              href={`/${item.toLowerCase().replace(' ', '-')}`} 
              className="flex mx-[10px] text-black hover:text-green-500 transition-colors duration-200"
            >
              {item}
            </Link>
          </div>
        ))}
        <Link href="/login" className="flex mx-[10px] bg-orange-500 w-20 h-10 text-white justify-center items-center hover:bg-orange-600 transition-colors duration-200">
          Login
        </Link>
      </nav>
    </header>
  )
}