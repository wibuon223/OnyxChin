import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { CONFIG } from './config.js'

/**
 * Fetch ke upstream dengan fallback proxy.
 *
 * Kenapa perlu: donghive.vip (Cloudflare) memblokir IP datacenter —
 * Render free-tier kena 403, sedangkan egress residential (WSL) lolos.
 * Solusinya: kalau direct gagal (403/406/429/5xx atau exception), putar
 * BrightData ISP proxy yang dikonfigurasi lewat env UPSTREAM_PROXIES.
 */
const agents = new Map()

function agentFor(proxyUrl) {
  if (!agents.has(proxyUrl)) {
    agents.set(proxyUrl, new ProxyAgent({ uri: proxyUrl }))
  }
  return agents.get(proxyUrl)
}

function normalizeProxy(entry) {
  const raw = String(entry).trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  return `http://${raw}`
}

export function upstreamProxies() {
  const raw = process.env.UPSTREAM_PROXIES || ''
  return raw
    .split(',')
    .map(normalizeProxy)
    .filter(Boolean)
}

/**
 * @param {string} url
 * @param {object} opts  { headers, timeoutMs, method, body, allowProxy }
 */
export async function fetchUpstream(url, opts = {}) {
  const {
    headers = {},
    timeoutMs = CONFIG.requestTimeoutMs,
    method = 'GET',
    body,
    allowProxy = true,
  } = opts

  const proxies = allowProxy ? upstreamProxies() : []
  const attempts = [null, ...proxies]

  let lastError = null
  for (let i = 0; i < attempts.length; i += 1) {
    const proxy = attempts[i]
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const init = {
        headers,
        method,
        body,
        signal: controller.signal,
        redirect: 'follow',
      }

      // PENTING: selalu pakai fetch dari paket undici yang sama dengan
      // ProxyAgent-nya. fetch bawaan Node memakai undici internal terpisah,
      // dan dispatcher dari instance lain akan error
      // "invalid onRequestStart method".
      const res = proxy
        ? await undiciFetch(url, { ...init, dispatcher: agentFor(proxy) })
        : await undiciFetch(url, init)

      // Status yang menandakan blokir IP -> perlu dicoba lewat proxy.
      if (proxy === null && res.status >= 400 && res.status !== 404 && proxies.length) {
        lastError = new Error(`upstream ${res.status} (direct, coba proxy)`)
        continue
      }
      return res
    } catch (err) {
      lastError = err
      // Lanjut ke lane berikutnya, jangan berhenti di lane pertama.
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  const detail = lastError?.cause?.message || lastError?.cause?.code || ''
  const err = new Error(
    `${lastError?.message || 'upstream fetch gagal'}${detail ? ` (${detail})` : ''} - ${url}`,
  )
  err.cause = lastError?.cause
  throw err
}

/** Ambil HTML lewat fallback proxy, error kalau status bukan 2xx. */
export async function fetchHtml(url, extraHeaders = {}) {
  const res = await fetchUpstream(url, {
    headers: { ...CONFIG.upstreamHeaders, ...extraHeaders },
  })
  if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`)
  return res.text()
}

/** Ambil binary (gambar) + headernya, lewat fallback proxy. */
export async function fetchBinary(url, extraHeaders = {}) {
  const res = await fetchUpstream(url, {
    headers: { ...CONFIG.upstreamHeaders, ...extraHeaders },
  })
  if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType: res.headers.get('content-type') || 'application/octet-stream' }
}
