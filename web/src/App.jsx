import { Compass } from 'lucide-react'
import Footer from './components/Footer'
import Nav from './components/Nav'
import { navigate, useRoute } from './hooks/useRoute'
import AnimeDetail from './pages/AnimeDetail'
import Browse from './pages/Browse'
import Home from './pages/Home'
import Watch from './pages/Watch'

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-ink-850 text-accent">
        <Compass size={26} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Alamat yang Anda tuju tidak tersedia di relay ini.
      </p>
      <a
        href="/"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          navigate('/')
        }}
        className="mt-6 inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-accent-soft"
      >
        Kembali ke beranda
      </a>
    </div>
  )
}

export default function App() {
  const route = useRoute()

  const renderPage = () => {
    switch (route.name) {
      case 'home':
      case 'search':
        return <Home />
      case 'browse':
        return <Browse />
      case 'anime':
        return <AnimeDetail slug={route.params.slug} />
      case 'watch':
        return <Watch slug={route.params.slug} />
      default:
        return <NotFound />
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav path={route.path} />

      <main className="flex-1 pb-20 md:pb-0">{renderPage()}</main>

      <Footer />
    </div>
  )
}
