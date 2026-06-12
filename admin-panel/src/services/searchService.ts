import api from '../lib/axios'

export interface SearchResultItem {
  id: string
  category: 'booking' | 'customer' | 'driver' | 'operator'
  title: string
  subtitle?: string
  href: string
}

export interface SearchResponse {
  results: SearchResultItem[]
  total: number
}

export const searchService = {
  search: (q: string, limit = 10) =>
    api.get<SearchResponse>('/search', { params: { q, limit } }).then(r => r.data),
}
