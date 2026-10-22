# Origin spoof — "seakan nonton dari web aslinya"

Player Dailymotion memutuskan boleh/tidaknya sebuah embed dari **JS di sisi klien**:

```js
let t = ""
try { t = window.top.location.href }                    // cross-origin → throw
catch { const n = location.ancestorOrigins; t = n[n.length - 1] }
new URL(t).hostname                                      // ← yang dibandingkan
```

Kalau hostname-nya bukan domain yang diizinkan, player berhenti dengan
*"This video cannot be played on this site"*. Selain itu manifest HLS-nya
diikat ke cookie sesi `dmvk` yang cuma ada kalau halaman benar-benar berada
di origin pemiliknya.

Ada dua tingkat bypass:

| level | cara | hasil |
|---|---|---|
| 1 | shim JS (`document.referrer`, `location.ancestorOrigins`) | cek domain lewat, tapi media masih 403 (cookie/sesi) |
| 2 | **origin asli**: hosts + local CA + reverse proxy | player DM native, cookie asli, iklan normal — sama seperti situsnya |

Tool di folder ini mengerjakan level 2.

## Isi

```
make-cert.sh   bikin CA + sertifikat untuk donghive.vip
server.mjs     reverse proxy HTTPS: /nonton/<slug> (player) + sisanya ke situs asli
certs/         hasil make-cert.sh (jangan di-commit)
```

## Pakai

### 1. Sertifikat

```bash
bash make-cert.sh donghive.vip
# → certs/ca.crt, certs/site.crt, certs/site.key
```

### 2. Arahkan domain ke mesin sendiri

Windows (`notepad C:\Windows\System32\drivers\etc\hosts`, jalankan sebagai admin):

```
127.0.0.1 donghive.vip
127.0.0.1 www.donghive.vip
```

Linux/macOS: `sudo nano /etc/hosts` dengan dua baris yang sama.

### 3. Percayai CA

Windows (admin):
```bat
certutil -addstore -user Root certs\ca.crt
```
Linux (Debian/Ubuntu):
```bash
sudo cp certs/ca.crt /usr/local/share/ca-certificates/onyx-spoof.crt && sudo update-ca-certificates
```
Firefox pakai store sendiri: Settings → Certificates → View → Authorities → Import.

### 4. Jalankan

```bash
node server.mjs --port 443
```
Butuh hak bind port <1024 (`sudo` di Linux, PowerShell admin di Windows).

Kalau 443 dipakai proses lain atau tidak bisa bind (WSL: `ip_unprivileged_port_start=1024`),
pakai port lain **dan** teruskan dari Windows:

```bat
netsh interface portproxy add v4tov4 listenaddress=127.0.0.1 listenport=443 ^
  connectaddress=127.0.0.1 connectport=8443
```

Cek: `https://donghive.vip/__health` → `{"ok":true,...}`

> Port ikut masuk ke *origin*, tapi **tidak** ke `hostname`. Jadi `https://donghive.vip:8443`
> masih lolos cek DM (`new URL(t).hostname` → `donghive.vip`). Untuk hasil paling bersih
> tetap pakai 443.

### 5. Nonton

- `https://donghive.vip/nonton/<slug-episode>` → player relay, iframe Dailymotion **native**
- `https://donghive.vip/<path apa pun>` → diteruskan ke situs asli (cookie & sesi utuh)
- `?server=okru|odysee|dtube|mega|dailymotion` → pilih mirror

## Kenapa ini bekerja

1. Browser berada **benar-benar** di `https://donghive.vip` → `ancestorOrigins`,
   `document.referrer`, dan `Origin` yang dikirim ke Dailymotion sah.
2. Cookie `dmvk`/`ts` disimpan untuk domain itu dan ikut terkirim ke
   `geo.dailymotion.com` / `dmxleo.dailymotion.com` → manifest HLS 200, bukan 403.
3. Tidak ada patch JS, tidak ada proxy media: player DM yang asli yang bicara.

Verifikasi kondisi ini tanpa spoof: buka halaman episode langsung di donghive.vip,
klik play di dalam iframe-nya → `video.duration = 1183.4`, `readyState 1`,
`paused false`. Embedder `donghive.vip` memang diizinkan; relay biasa ditolak
karena embedder-nya domain relay.

## Batasan yang jujur

- Upstream di-resolve lewat DoH (1.1.1.1) karena `/etc/hosts` sudah menunjuk ke
  lokal — butuh jaringan keluar.
- Situsnya sendiri tetap lewat Cloudflare; kalau CF memblokir IP-mu, halaman
  aslinya ikut gagal (player relay di `/nonton/...` tidak terpengaruh).
- Kalau Dailymotion mengganti mekanisme pengecekan domain, level 2 tetap jalan
  selama embedder asli masih diizinkan.
- Jangan pakai `--hosts` untuk domain yang bukan milikmu: server ini meneruskan
  trafik apa adanya, jadi apa pun yang kamu ketik di situ diteruskan ke upstream.
