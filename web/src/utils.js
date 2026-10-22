export function slugFromUrl(url) {
  if (!url || typeof url !== 'string') return ''
  let pathname = url
  try {
    pathname = new URL(url, window.location.origin).pathname
  } catch {
    pathname = url.split('?')[0].split('#')[0]
  }
  const parts = pathname.split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

export function resolveAsset(url) {
  if (!url || typeof url !== 'string') return ''
  const value = url.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `https:${value}`
  if (value.startsWith('/')) return value
  return `/${value}`
}

export function stripHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function episodeLabel(number) {
  if (number === undefined || number === null || number === '') return '-'
  return `EP ${String(number).padStart(2, '0')}`
}
