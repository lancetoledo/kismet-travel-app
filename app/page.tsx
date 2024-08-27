import Header from '../components/Header'
import Banner from '../components/Banner'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-8 w-[1300px] flex flex-col">
        <Header />
        <Banner />
      </div>
    </main>
  )
}