import { Sparkles } from 'lucide-react'
import SearchBar from './SearchBar'

export default function Hero({
  onSearch,
  loading = false,
  query = '',
  badges = [],
  title = 'Streaming anime subtitle Indonesia',
  description = 'Relay mirroring donghive.vip dengan player embed yang stabil. Temukan judul terbaru, lanjutkan episode, dan nonton langsung tanpa interstitial.',
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-fade"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 hidden h-72 w-72 rounded-full bg-accent/10 blur-3xl lg:block"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
        <div className="max-w-3xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
            Relay aktif
          </span>

          <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-6xl">
            Streaming anime subtitle Indonesia
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {description}
          </p>

          <div className="mt-7 max-w-xl">
            <SearchBar
              size="lg"
              onSearch={onSearch}
              loading={loading}
              defaultValue={query}
              placeholder="Cari judul, misalnya: Jade Dynasty"
            />
          </div>

          {badges.length ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="label mr-1">Kategori</span>
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/10 bg-ink-850/70 px-3 py-1 text-xs font-medium text-slate-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
