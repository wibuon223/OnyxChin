/** Kunci cache + TTL per jenis data. Satu tempat biar nggak beda-beda. */

export const TTL = {
  home: 10 * 60_000,
  genres: 30 * 60_000,
  anime: 10 * 60_000,
  episode: 5 * 60_000,
  search: 3 * 60_000,
  browse: 5 * 60_000,
}

export const KEY = {
  home: 'home',
  genres: 'genres',
  anime: (slug) => `anime:${slug}`,
  episode: (slug) => `episode:${slug}`,
  search: (q) => `search:${q}`,
  browse: (page) => `browse:${page}`,
}
