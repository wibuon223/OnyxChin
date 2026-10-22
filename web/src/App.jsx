import { Suspense, lazy } from 'react'
import { Compass } from 'lucide-react'
import Footer from './components/Footer'
import Nav from './components/Nav'
import Toaster from './components/Toaster'
import { navigate, useRoute } from './hooks/useRoute'

/* Lazy route: bundle awal tetap kecil, halaman berat dimuat saat dibutuhkan. */
const Home = lazy(() => import('./pages/Home'))
const Browse = lazy(() => import('./pages/Browse'))
const AnimeDetail = lazy(() => import('./pages/AnimeDetail'))
const Watch = lazy(() => import('./pages/Watch'))
const HistoryPage = lazy(() => import('./pages/History'))

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="skeleton h-7 w-40 rounded-full" />
      <div className="skeleton mt-4 h-12 w-2/3 rounded-2xl" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton aspect-[2/3] w-full rounded-2xl" />
            <div className="skeleton h-3 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-accent shadow-glass">
        <Compass size={24} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h1 className="display-2 mt-5">Halaman tidak ditemukan</h1>
      <p className="prose-muted mt-2">Alamat yang kamu tuju tidak tersedia di relay ini.</p>
      <a
        href="/"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          navigate('/')
        }}
        className="btn-primary mt-6"
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
      case 'history':
        return <HistoryPage />
      default:
        return <NotFound />
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav path={route.path} />

      <main key={route.path} className="flex-1 animate-fade-in pb-28 md:pb-10">
        <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
      </main>

      <Footer />
      <Toaster />
    </div>
  )
}
