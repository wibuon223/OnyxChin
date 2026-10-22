/**
 * OpenAPI 3.0 spec — diasync dari server saat start supaya base URL
 * selalu Absolute (Render / localhost / domain custom).
 */
export function buildOpenApi({ origin, version }) {
  const s = (path) => `${origin}${path}`

  return {
    openapi: '3.0.3',
    info: {
      title: 'OnyxChin API',
      version,
      description:
        'Relay/bridge untuk streaming anime subtitle Indonesia dari sumber https://donghive.vip.\n\n' +
        '**Apa itu relay ini?** Semua link embed dipungkus ke domain sendiri: iframe播放器 memakai ' +
        '`/e/<slug>` (halaman bridge milik server ini) dan URL selalu absolut terhadap host aktif. ' +
        'Bridge juga menyediakan reverse-proxy penuh (`/bridge/dm`) yang menarik dokumen player ' +
        'Dailymotion lewat server sehingga browser hanya pernah bicara ke origin kita.',
      contact: { name: 'OnyxChin' },
      license: { name: 'MIT' },
    },
    servers: [{ url: origin, description: 'Instance aktif' }],
    tags: [
      { name: 'System', description: 'Health & metadata' },
      { name: 'Catalog', description: 'Daftar anime, section, genre, pencarian' },
      { name: 'Anime', description: 'Detail anime & episode' },
      { name: 'Bridge', description: 'Relay / reverse-proxy / embed wrapper' },
    ],
    components: {
      schemas: {
        Card: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            slug: { type: 'string' },
            section: { type: 'string' },
            type: { type: 'string', example: 'ONA' },
            episode: { type: 'string', example: 'Ep 90' },
            subtitle: { type: 'string', example: 'Sub' },
            thumbnail: { type: 'string', format: 'uri' },
            series: { type: 'string' },
            rank: { type: 'string' },
            genres: { type: 'array', items: { type: 'string' } },
          },
        },
        Episode: {
          type: 'object',
          properties: {
            number: { type: 'string', example: '90' },
            title: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            slug: { type: 'string' },
            release_date: { type: 'string', example: 'Oktober 22, 2026' },
            subtitle: { type: 'string', example: 'Sub' },
            embed: { type: 'string', description: 'URL absolut ke halaman bridge' },
          },
        },
        AnimeDetail: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            slug: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            network: { type: 'string' },
            released: { type: 'string' },
            updated: { type: 'string' },
            reported_episodes: { type: 'string' },
            genres: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'uri' },
            total_episodes: { type: 'integer' },
            episodes: { type: 'array', items: { $ref: '#/components/schemas/Episode' } },
          },
        },
        EpisodePage: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            slug: { type: 'string' },
            anime_title: { type: 'string' },
            anime_url: { type: 'string', format: 'uri' },
            anime_slug: { type: 'string' },
            embed: { type: 'string', description: 'URL absolut ke halaman bridge' },
            direct_url: { type: 'string', format: 'uri', description: 'URL player sumber (mentah)' },
            video_id: { type: 'string' },
            default_server: {
              type: 'string',
              description: 'kind server yang dipakai default (yang bisa diputar)',
              example: 'okru',
            },
            servers: {
              type: 'array',
              description:
                'Daftar mirror dari <select class="mirror"> upstream, urut dari yang paling bisa diputar',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'OKRU' },
                  kind: {
                    type: 'string',
                    enum: ['okru', 'odysee', 'mega', 'dtube', 'dailymotion', 'other'],
                  },
                  url: { type: 'string', format: 'uri' },
                  playable: {
                    type: 'boolean',
                    description:
                      'false kalau provider tidak bisa diputar dari domain relay (DM dikunci domain, DTube CDN 404)',
                  },
                  note: { type: 'string' },
                },
              },
            },
            downloads: { type: 'array', items: { type: 'object' } },
            description: { type: 'string' },
          },
        },
        Embed: {
          type: 'object',
          properties: {
            video_id: { type: 'string' },
            embed_url: { type: 'string', format: 'uri' },
            direct_url: { type: 'string', format: 'uri' },
            iframe_html: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      uptime: { type: 'number' },
                      version: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/home': {
        get: {
          tags: ['Catalog'],
          summary: 'Semua section homepage',
          responses: {
            200: {
              description: 'Section map + flatten list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sections: {
                        type: 'object',
                        additionalProperties: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Card' },
                        },
                      },
                      flat: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/anime': {
        get: {
          tags: ['Catalog'],
          summary: 'Listing anime (View All) dengan pagination',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'max_pages', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 1 } },
          ],
          responses: {
            200: {
              description: 'Listing',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      total_pages: { type: 'integer' },
                      items: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/genre/{slug}': {
        get: {
          tags: ['Catalog'],
          summary: 'Listing anime per genre',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'action' },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          ],
          responses: {
            200: {
              description: 'Listing',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      total_pages: { type: 'integer' },
                      items: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/genres': {
        get: {
          tags: ['Catalog'],
          summary: 'Daftar genre',
          responses: {
            200: {
              description: 'Genres',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      genres: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            url: { type: 'string', format: 'uri' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/search': {
        get: {
          tags: ['Catalog'],
          summary: 'Cari anime',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'jade' },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          ],
          responses: {
            200: {
              description: 'Hasil',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      items: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/anime/{slug}': {
        get: {
          tags: ['Anime'],
          summary: 'Detail anime + daftar episode',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'jade-dynasty',
            },
          ],
          responses: {
            200: {
              description: 'Detail',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AnimeDetail' } },
              },
            },
            404: {
              description: 'Tidak ditemukan',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Error' } },
              },
            },
          },
        },
      },
      '/api/episode/{slug}': {
        get: {
          tags: ['Anime'],
          summary: 'Detail satu episode + link embed',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'jade-dynasty-episode-90-subtitle-indonesia',
            },
          ],
          responses: {
            200: {
              description: 'Episode',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/EpisodePage' } },
              },
            },
          },
        },
      },
      '/api/embed/{videoId}': {
        get: {
          tags: ['Bridge'],
          summary: 'URL embed absolut untuk sebuah video id',
          parameters: [
            {
              name: 'videoId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'k7sDcY1kBIyCqgM0Rl0',
            },
          ],
          responses: {
            200: {
              description: 'Embed',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Embed' } },
              },
            },
          },
        },
      },
      '/e/{slug}': {
        get: {
          tags: ['Bridge'],
          summary: 'Halaman bridge (HTML) — iframe player dari domain sendiri',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'jade-dynasty-episode-90-subtitle-indonesia',
            },
            {
              name: 'mode',
              in: 'query',
              schema: { type: 'string', enum: ['bridge', 'proxy', 'direct'], default: 'bridge' },
            },
          ],
          responses: { 200: { description: 'HTML player' } },
        },
      },
      '/bridge/dm': {
        get: {
          tags: ['Bridge'],
          summary: 'Reverse-proxy dokumen player Dailymotion',
          parameters: [
            { name: 'video', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'HTML hasil proxy' } },
        },
      },
      '/api/proxy': {
        get: {
          tags: ['Bridge'],
          summary: 'Proxy aset yang diizinkan (dailymotion/dmcdn saja)',
          parameters: [{ name: 'u', in: 'query', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Aset' },
            403: {
              description: 'Host tidak diizinkan',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Error' } },
              },
            },
          },
        },
      },
    },
  }
}
