/**
 * Compat layer: ekspor sumber default (donghive) dengan nama fungsi lama,
 * supaya import yang sudah ada tidak perlu diubah semua.
 *
 * Untuk memilih sumber lain, pakai `source('anichin')` dari scraper.js.
 */
import { SOURCES, source } from './scraper.js'

export { SOURCES, source, createSource } from './scraper.js'

const donghive = source('donghive')

export const slugify = donghive.slugify
export const animeSlugFromEpisodeSlug = donghive.animeSlugFromEpisodeSlug
export const fetchHome = donghive.fetchHome
export const fetchListing = donghive.fetchListing
export const fetchViewAll = donghive.fetchViewAll
export const fetchGenrePage = donghive.fetchGenrePage
export const fetchSearch = donghive.fetchSearch
export const fetchGenres = donghive.fetchGenres
export const fetchAnimeDetail = donghive.fetchAnimeDetail
export const parseServers = donghive.parseServers
export const fetchEpisodePage = donghive.fetchEpisodePage
export const extractVideoId = donghive.extractVideoId
export const dedupe = donghive.dedupe
