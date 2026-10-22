import { BookOpen, Compass, Home, Radio } from 'lucide-react'
import { navigate } from '../hooks/useRoute'

const LINKS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/anime', label: 'Jelajah', icon: Compass },
  { to: '/docs', label: 'API', icon: BookOpen },
]

function isActive(currentPath, to) {
  if (to === '/') return currentPath === '/'
  return currentPath === to || currentPath.startsWith(`${to}/`)
}

export default function Nav({ path = '/' }) {
  const go = (event, to) => {
    if (to === '/docs') return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(to)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          onClick={(event) => go(event, '/')}
          className="flex items-center gap-2.5"
          aria-label="Donghive Relay - Beranda"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
            <Radio size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.24em] text-white sm:text-[15px]">
            Donghive
            <span className="hidden text-accent sm:inline"> Relay</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {LINKS.map((link) => {
            const Icon = link.icon
            const active = isActive(path, link.to)
            return (
              <a
                key={link.to}
                href={link.to}
                onClick={(event) => go(event, link.to)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                {link.label}
              </a>
            )
          })}
        </nav>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 backdrop-blur-md md:hidden"
        aria-label="Navigasi mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {LINKS.map((link) => {
            const Icon = link.icon
            const active = isActive(path, link.to)
            return (
              <a
                key={link.to}
                href={link.to}
                onClick={(event) => go(event, link.to)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition ${
                  active ? 'text-accent' : 'text-slate-500'
                }`}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                {link.label}
              </a>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
