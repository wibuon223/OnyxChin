import { BookOpen, Radio } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-ink-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <Radio size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-white">
              Donghive Relay
            </span>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-500">
            Relay reverse-proxy untuk streaming anime subtitle Indonesia. Konten
            bersumber dari donghive.vip.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-6">
          <a
            href="/docs"
            className="inline-flex items-center gap-2 text-slate-400 transition hover:text-accent"
          >
            <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
            Dokumentasi API
          </a>
          <span>Dibangun untuk veneer anime.</span>
        </div>
      </div>
    </footer>
  )
}
