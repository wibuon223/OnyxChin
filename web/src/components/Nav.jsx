import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Compass,
  History,
  Home,
  Menu,
  Play,
  Radio,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import useHistory from '../hooks/useHistory'
import { navigate } from '../hooks/useRoute'
import { SOURCES, getSource, setSource, sourceLabel } from '../lib/source'
import CtaDialog from './CtaDialog'

const LINKS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/anime', label: 'Jelajah', icon: Compass },
  { to: '/history', label: 'Riwayat', icon: History },
]

function isActive(path, to) {
  if (to === '/') return path === '/'
  return path === to || path.startsWith(`${to}/`)
}

export default function Nav({ path = '/' }) {
  const [drawer, setDrawer] = useState(false)
  const [cta, setCta] = useState(false)
  const [activeSource, setActiveSource] = useState(() => getSource())
  const history = useHistory()

  const go = (event, to) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setDrawer(false)
    navigate(to)
  }

  // ESC menutup drawer + kunci scroll saat terbuka
  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawer(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [drawer])

  // pintasan: "/" buka CTA, "g h" ke riwayat
  useEffect(() => {
    const onKey = (event) => {
      const tag = (event.target?.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable
      if (typing) return
      if (event.key === '/') {
        event.preventDefault()
        setCta(true)
      }
      if (event.key === 'Escape') setDrawer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const recent = history.items.slice(0, 3)

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="glass border-x-0 border-t-0">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <a
              href="/"
              onClick={(event) => go(event, '/')}
              className="group flex items-center gap-2.5"
              aria-label="OnyxChin — beranda"
            >
              <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] text-accent shadow-glass">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-jade/20"
                />
                <Radio size={17} strokeWidth={2.1} className="relative" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[15px] font-extrabold leading-none tracking-[-0.01em] text-white">
                  Onyx<span className="text-accent">Chin</span>
                </span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Relay
                </span>
              </span>
            </a>

            <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
              {LINKS.map((link) => {
                const Icon = link.icon
                const active = isActive(path, link.to)
                return (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={(event) => go(event, link.to)}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-300 ease-silk ${
                      active
                        ? 'bg-white/[0.08] text-white shadow-ring'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
                    {link.label}
                  </a>
                )
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCta(true)}
                className="hidden h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[13px] text-slate-400 backdrop-blur-md transition duration-300 hover:border-white/20 hover:text-white sm:flex"
              >
                <Search size={14} strokeWidth={2.2} aria-hidden="true" />
                <span>Cari judul</span>
                <kbd className="ml-1 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  /
                </kbd>
              </button>

              <button type="button" onClick={() => setCta(true)} className="btn-primary h-10 px-4">
                <Play size={14} strokeWidth={2.4} aria-hidden="true" />
                <span className="hidden sm:inline">Nonton</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="btn-icon"
                aria-label="Buka menu"
                aria-expanded={drawer}
              >
                <Menu size={17} strokeWidth={2.1} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-[75]">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-md animate-fade-in"
            tabIndex={-1}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="glass-strong absolute right-0 top-0 flex h-full w-[min(88vw,23rem)] animate-drawer-in flex-col overflow-y-auto rounded-l-3xl px-5 pb-8 pt-5"
          >
            <div className="flex items-center justify-between">
              <span className="label-accent">Menu</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="btn-icon h-9 w-9"
                aria-label="Tutup menu"
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-5 space-y-1" aria-label="Navigasi menu">
              {LINKS.map((link) => {
                const Icon = link.icon
                const active = isActive(path, link.to)
                return (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={(event) => go(event, link.to)}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                      active ? 'bg-white/[0.08] text-white' : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
                    {link.label}
                  </a>
                )
              })}
              <a
                href="/docs"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
              >
                <BookOpen size={16} strokeWidth={2.1} aria-hidden="true" />
                API &amp; dokumentasi
                <ArrowUpRight size={14} strokeWidth={2.2} className="ml-auto text-slate-600" aria-hidden="true" />
              </a>
            </nav>

            <div className="divider my-5" />

            <div className="flex items-center justify-between">
              <span className="label flex items-center gap-1.5">
                <Clock3 size={12} strokeWidth={2.2} aria-hidden="true" />
                Lanjut nonton
              </span>
              {history.items.length ? (
                <button
                  type="button"
                  onClick={(event) => go(event, '/history')}
                  className="text-[11px] font-semibold text-accent/90 transition hover:text-accent"
                >
                  Semua
                </button>
              ) : null}
            </div>

            <div className="mt-2 space-y-1.5">
              {recent.length ? (
                recent.map((item) => (
                  <a
                    key={item.animeSlug}
                    href={`/watch/${item.episodeSlug}`}
                    onClick={(event) => go(event, `/watch/${item.episodeSlug}`)}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 transition hover:border-white/10 hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-[13px] font-semibold text-slate-200 group-hover:text-white">
                        {item.animeTitle || item.animeSlug}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Episode {item.episodeNumber || '—'}
                      </span>
                    </span>
                    <Play size={13} strokeWidth={2.4} className="shrink-0 text-accent/70" aria-hidden="true" />
                  </a>
                ))
              ) : (
                <p className="px-3 py-2 text-[12px] leading-relaxed text-slate-500">
                  Belum ada riwayat. Episode yang kamu buka akan muncul di sini — disimpan di
                  browser ini, bukan di server.
                </p>
              )}
            </div>

            <div className="divider my-5" />

            <div className="flex items-center justify-between">
              <span className="label">Sumber katalog</span>
              <span className="font-mono text-[10px] text-slate-600">{sourceLabel(activeSource)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {SOURCES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSource(item.id)
                    setSource(item.id)
                  }}
                  aria-pressed={activeSource === item.id}
                  title={item.hint}
                  className={`chip flex-1 justify-center ${
                    activeSource === item.id ? 'chip-active' : ''
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="glass-soft rounded-2xl p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Sparkles size={12} strokeWidth={2.2} aria-hidden="true" />
                  Pintasan
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-slate-400">
                  <li className="flex items-center justify-between gap-2">
                    <span>Cari judul</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[10px]">/</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Episode sebelumnya</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[10px]">←</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Episode berikutnya</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[10px]">→</kbd>
                  </li>
                </ul>
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-slate-600">
                Sumber konten: donghive.vip. Relay ini cuma memantulkan player publiknya.
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Bottom bar (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        aria-label="Navigasi bawah"
      >
        <div className="glass mx-3 mb-3 flex items-center justify-around rounded-2xl px-2 py-1.5">
          {LINKS.map((link) => {
            const Icon = link.icon
            const active = isActive(path, link.to)
            return (
              <a
                key={link.to}
                href={link.to}
                onClick={(event) => go(event, link.to)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
                  active ? 'text-accent' : 'text-slate-500'
                }`}
              >
                <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                {link.label}
              </a>
            )
          })}
        </div>
      </nav>

      <CtaDialog open={cta} onClose={() => setCta(false)} />
    </>
  )
}
