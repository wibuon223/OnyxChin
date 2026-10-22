import { BookOpen, Radio } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 px-4 pb-6 sm:px-6 lg:px-8">
      <div className="glass mx-auto w-full max-w-7xl rounded-3xl px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-accent">
                <Radio size={16} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.22em] text-white">
                Donghive Relay
              </span>
            </div>
            <p className="max-w-md text-[12px] leading-relaxed text-slate-500">
              Relay player publik untuk streaming donghua subtitle Indonesia. Konten bersumber dari
              donghive.vip; riwayat tontonan cuma tersimpan di browser kamu.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:gap-5">
            <a
              href="/docs"
              className="inline-flex items-center gap-2 text-slate-400 transition hover:text-accent"
            >
              <BookOpen size={14} strokeWidth={2.1} aria-hidden="true" />
              Dokumentasi API
            </a>
            <a href="/history" className="text-slate-400 transition hover:text-accent">
              Riwayat saya
            </a>
            <span className="text-slate-600">No tracking · No akun</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
