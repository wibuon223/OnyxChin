import { useState } from 'react'
import { ArrowRight, Play, Search, Sparkles } from 'lucide-react'

export default function Hero({
  onSearch,
  loading = false,
  query = '',
  badges = [],
  title = 'Nonton donghua, tanpa jeda.',
  description = 'Relay player publik donghive.vip dengan antarmuka yang lebih tenang: episode langsung, riwayat tersimpan di browser, dan API terbuka.',
}) {
  const [value, setValue] = useState(query)

  const submit = (event) => {
    event.preventDefault()
    const term = value.trim()
    if (term) onSearch?.(term)
  }

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-fade opacity-[0.25]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl animate-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-6 h-64 w-64 rounded-full bg-jade/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="max-w-3xl animate-fade-up">
          <span className="eyebrow">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Relay aktif
          </span>

          <h1 className="display-1 mt-5">
            Nonton donghua,{' '}
            <span className="bg-gradient-to-r from-accent via-accent-soft to-jade bg-clip-text text-transparent">
              tanpa jeda
            </span>
            .
          </h1>

          <p className="prose-muted mt-4 max-w-2xl text-[15px] sm:text-base">{description}</p>

          <form onSubmit={submit} className="glass mt-8 flex items-center gap-2 rounded-2xl p-1.5">
            <span className="pl-3 text-slate-500">
              <Search size={17} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Cari judul — mis. Jade Dynasty, Swallowed Star…"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:outline-none"
              aria-label="Cari judul"
            />
            <button type="submit" className="btn-primary h-10 shrink-0 px-4" disabled={loading}>
              <Play size={14} strokeWidth={2.4} aria-hidden="true" />
              Cari
            </button>
          </form>

          {badges.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="label inline-flex items-center gap-1.5">
                <Sparkles size={11} strokeWidth={2.2} aria-hidden="true" />
                Kategori
              </span>
              {badges.map((badge) => (
                <span key={badge} className="chip">
                  {badge}
                  <ArrowRight size={11} strokeWidth={2.4} className="text-slate-600" aria-hidden="true" />
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-6 text-[11.5px] text-slate-500">
            Riwayat tontonan disimpan di browser ini · Tanpa iklan pop-up · Sumber: donghive.vip
          </p>
        </div>
      </div>
    </section>
  )
}
