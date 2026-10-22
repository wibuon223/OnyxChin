/* Service worker relay Dailymotion.
 *
 * Player DM menjalankan hls.js di dalam Web Worker, jadi patch
 * window.fetch / XMLHttpRequest di dokumen tidak menjangkau request media.
 * Service worker memegang kontrol penuh: semua request ke *.dailymotion.com /
 * *.dmcdn.net dibelokkan ke /api/proxy milik relay, yang mengirim
 * Referer + Origin donghive.vip + cookie sesi DM dan menulis ulang URI di
 * dalam manifest.
 *
 * Kalau upstream menolak sebuah manifest (403/404 — tipikal iklan yang
 * `sec`-nya terikat ke sesi lain), balas dengan playlist kosong yang valid.
 * Player menganggap stream itu selesai lalu lanjut ke konten utama, bukan
 * berhenti di "Playback error".
 */

const DM_RE = /^https?:\/\/([a-z0-9-]+\.)*(dailymotion\.com|dmcdn\.net|dm-event\.net)\//i
const EMPTY_HLS = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-ENDLIST\n'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url
  if (!DM_RE.test(url)) return

  const proxied = self.location.origin + '/api/proxy?u=' + encodeURIComponent(url)
  event.respondWith(
    fetch(proxied, { credentials: 'omit', mode: 'cors' })
      .then((res) => {
        if (res.ok) return res
        if (/\.m3u8/i.test(url)) {
          return new Response(EMPTY_HLS, {
            status: 200,
            headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' },
          })
        }
        return res
      })
      .catch(() => {
        if (/\.m3u8/i.test(url)) {
          return new Response(EMPTY_HLS, {
            status: 200,
            headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
          })
        }
        return fetch(event.request)
      }),
  )
})
