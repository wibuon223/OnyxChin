# OnyxChin

Reverse-proxy / embed-wrapper untuk streaming anime subtitle Indonesia dari sumber `https://donghive.vip`.

> Namanya: **relay** (atau *reverse proxy* / *embed proxy* / *stream bridge*).
> Intinya: semua link embed dibungkus ke origin sendiri, jadi browser tidak pernah
> secara langsung menyentuh CDN video, dan halaman player bisa dikontrol penuh.

## Sumber (multi-source)

Relay ini bisa membaca dua situs dengan tema WordPress yang sama:

| id | base | catatan |
|---|---|---|
| `donghive` (default) | https://donghive.vip | katalog lengkap, sebagian episode cuma punya Dailymotion (dikunci domain) |
| `anichin` | https://anichin.moe | 7–8 mirror per episode (OKRU, Odysee, Nunadrama, DTube, MEGA, Rumble, dll) |

Pilih lewat UI (drawer → **Sumber katalog**) atau API: `?src=anichin` pada
`/api/home`, `/api/anime`, `/api/genre/:slug`, `/api/search`, `/api/anime/:slug`,
`/api/episode/:slug`. Tanpa parameter = `donghive`.

Kode scraper ada di `server/scraper.js` (`createSource(base, imageHosts)`),
`server/donghive.js` cuma re-export sumber default supaya import lama tetap jalan.

## Paging (hasil RE)

- Arsip `/anime/` → `?page=N` (bukan `/page/N/`), 20 judul/halaman.
- Genre `/genres/<slug>/` → `/page/N/`, 10 judul/halaman, jumlah halaman ada di markup.
- Pencarian `?s=<q>` strict substring — typo = 0 hasil, jadi ada saran trigram.

## Fitur

- **Relay / bridge** — `/e/<slug>` menyajikan halaman player milik server sendiri; iframe-nya
  menunjuk ke origin kita. Mode `?mode=proxy` menarik dokumen player Dailymotion lewat server
  (reverse proxy penuh) lalu rewrite semua URL aset/API lewat `/api/proxy`.
- **Anti-hotlink** — `/api/proxy` hanya mengizinkan host dailymotion/dmcdn (allowlist, anti-SSRF).
- **URL absolut** — semua `embed` yang dikembalikan API dibangun dari host aktif
  (`X-Forwarded-Host` / `X-Forwarded-Proto`), jadi benar di Render maupun localhost.
- **Scraper** — homepage (10 section), View All + pagination, genre, search, detail anime,
  daftar episode, halaman episode.
- **API docs** — Swagger UI di `/docs`, spec di `/openapi.json`.
- **Web UI** — React + Vite + Tailwind + lucide-react, responsive mobile & desktop.

## Stack

| Layer | Tech |
|---|---|
| Server | Node 22 + Express 4 + cheerio |
| Bridge | fetch + rewrite URL + allowlist proxy |
| Docs | swagger-ui-express (OpenAPI 3.0) |
| Frontend | React 18 + Vite 5 + Tailwind 3 + lucide-react |
| Deploy | Render (native Node, blueprint `render.yaml`) |

## Menjalankan lokal

```bash
npm install
npm run build      # build frontend ke public/
npm start         # http://localhost:8080
```

Dev frontend dengan hot reload:

```bash
npm run dev:web   # http://localhost:5173 (proxy ke :8080)
```

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/health` | health check |
| GET | `/api/config` | konfigurasi aktif |
| GET | `/api/home` | semua section homepage + flatten list |
| GET | `/api/anime?page=1&max_pages=1` | listing View All + pagination |
| GET | `/api/genre/:slug?page=1` | listing per genre |
| GET | `/api/genres` | daftar genre |
| GET | `/api/search?q=jade&page=1` | pencarian |
| GET | `/api/anime/:slug` | detail anime + daftar episode |
| GET | `/api/episode/:slug` | detail episode + link embed |
| GET | `/api/embed/:videoId` | URL embed absolut + iframe HTML |
| GET | `/e/:slug` | **halaman bridge** (HTML player) |
| GET | `/bridge/dm?video=<id>` | reverse-proxy dokumen player Dailymotion |
| GET | `/api/proxy?u=<url>` | proxy aset (allowlist) |
| GET | `/docs` | Swagger UI |
| GET | `/openapi.json` | OpenAPI spec |

### Contoh

```bash
curl https://<host>/api/home | jq '.sections | keys'
curl https://<host>/api/anime/jade-dynasty | jq '.episodes[0]'
curl https://<host>/api/episode/jade-dynasty-episode-90-subtitle-indonesia | jq '.embed'
```

## Cara kerja bridge

```
browser ──▶ /e/<slug>                (halaman kita, iframe 16:9)
                 │
                 ├─▶ /bridge/dm?video=<id>   (reverse-proxy dokumen player)
                 │        └─▶ geo.dailymotion.com/player/...
                 │              (URL aset/API di-rewrite ke /api/proxy)
                 │
                 └─▶ /api/proxy?u=<url>       (proxy aset, allowlist)
```

Resolution slug episode → video id disimpan di cache in-memory (TTL 30 menit),
jadi satu request ke upstream per episode, bukan per render.

## Deploy ke Render

`render.yaml` sudah disiapkan (plan `free`, region `singapore`, health check `/api/health`).

```bash
# lewat dashboard: New > Blueprint, arahkan ke repo ini
# atau via API:
curl -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_KEY" \
  -H "Content-Type: application/json" \
  -d @service.json
```

Variable:
- `PORT` — otomatis dari Render
- `NODE_ENV` — `production`
- `PUBLIC_ORIGIN` — opsional, override origin di spec OpenAPI

## Catatan

- Free tier Render tidur setelah ~15 menit idle; request pertama bangun lambat.
  Endpoint berat sudah di-cache TTL (home 60s, listing 120s, detail 300s).
- Sumber metadata: `https://donghive.vip` (struktur DOM: WordPress + tema Animescape).
- Reply `/api/*` selalu JSON; error memakai `{ "error": "..." }`.
