import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import type { SearchResultItem } from '../../services/searchService'
import { searchService } from '../../services/searchService'

interface StaticPage {
  title: string
  subtitle: string
  href: string
  icon: string
}

const STATIC_PAGES: StaticPage[] = [
  { title: 'Dashboard',          subtitle: 'Overview & KPIs',           href: '/dashboard',      icon: 'pie' },
  { title: 'Bookings',           subtitle: 'Manage all road bookings',  href: '/bookings',       icon: 'receipt' },
  { title: 'Drivers',            subtitle: 'Driver management',         href: '/drivers',        icon: 'user' },
  { title: 'Customers',          subtitle: 'Customer management',       href: '/customers',      icon: 'users' },
  { title: 'Operators',          subtitle: 'Fleet operators',           href: '/operators',      icon: 'briefcase' },
  { title: 'Dispatch Console',   subtitle: 'Live dispatch & assign',    href: '/dispatch',       icon: 'bolt' },
  { title: 'Pricing',            subtitle: 'Fare rules & surge',        href: '/pricing',        icon: 'tag' },
  { title: 'Promotions',         subtitle: 'Coupons & referrals',       href: '/promotions',     icon: 'flag' },
  { title: 'Payments',           subtitle: 'Transactions & payouts',    href: '/payments',       icon: 'wallet' },
  { title: 'Reports',            subtitle: 'Analytics & exports',       href: '/reports',        icon: 'layers' },
  { title: 'Settings',           subtitle: 'Platform configuration',    href: '/settings',       icon: 'settings' },
  { title: 'Admin Users',        subtitle: 'Staff accounts & roles',    href: '/admin-users',    icon: 'shield' },
  { title: 'Notifications',      subtitle: 'Push & notification logs',  href: '/notifications',  icon: 'bell' },
  { title: 'Audit Log',          subtitle: 'System activity trail',     href: '/audit',          icon: 'archive' },
]

const CATEGORY_LABEL: Record<string, string> = {
  booking: 'Booking',
  customer: 'Customer',
  driver: 'Driver',
  operator: 'Operator',
}

const CATEGORY_ICON: Record<string, string> = {
  booking: 'receipt',
  customer: 'users',
  driver: 'user',
  operator: 'briefcase',
}

interface CombinedItem {
  key: string
  isPage?: boolean
  isResult?: boolean
  item: StaticPage | SearchResultItem
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter static pages by query
  const filteredPages = query.trim()
    ? STATIC_PAGES.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : STATIC_PAGES

  // Build combined flat list for keyboard nav
  const items: CombinedItem[] = [
    ...filteredPages.map(p => ({ key: `page-${p.href}`, isPage: true, item: p })),
    ...results.map(r => ({ key: `result-${r.id}`, isResult: true, item: r })),
  ]

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    setActiveIdx(0)
  }, [query, results.length])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchService.search(query.trim())
        setResults(data.results)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const go = useCallback((href: string) => {
    navigate(href)
    onClose()
  }, [navigate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const active = items[activeIdx]
      if (active) go(active.item.href)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '14vh', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1001, width: '100%', maxWidth: 600,
        background: 'var(--surface)',
        border: '1px solid var(--rule-strong)',
        borderRadius: 8,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '70vh',
      }}>

        {/* Search input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--rule)',
        }}>
          {loading
            ? <div style={{ width: 18, height: 18, flexShrink: 0, border: '2px solid var(--rule-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            : <Icon name="search" size={18} style={{ flexShrink: 0, color: 'var(--ink-3)' }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bookings, drivers, customers, operators…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--font-sans)',
            }}
          />
          <button className="btn icon sm" onClick={onClose} style={{ flexShrink: 0 }}>
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* Results list */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>

          {/* Static pages section */}
          {filteredPages.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 10.5, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}>
                {query.trim() ? 'Pages' : 'Quick navigation'}
              </div>
              {filteredPages.map((page, i) => {
                const idx = i
                const active = activeIdx === idx
                return (
                  <div
                    key={page.href}
                    data-idx={idx}
                    onClick={() => go(page.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 16px', cursor: 'pointer',
                      background: active ? 'var(--surface-2)' : 'transparent',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: 'var(--surface-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={page.icon as never} size={14} style={{ color: 'var(--ink-2)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{page.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{page.subtitle}</div>
                    </div>
                    {active && <Icon name="arrowRight" size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />}
                  </div>
                )
              })}
            </>
          )}

          {/* Data results section */}
          {results.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 10.5, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
                borderTop: filteredPages.length > 0 ? '1px solid var(--rule)' : undefined,
                marginTop: filteredPages.length > 0 ? 4 : 0,
              }}>
                Results
              </div>
              {results.map((r, i) => {
                const idx = filteredPages.length + i
                const active = activeIdx === idx
                return (
                  <div
                    key={r.id}
                    data-idx={idx}
                    onClick={() => go(r.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 16px', cursor: 'pointer',
                      background: active ? 'var(--surface-2)' : 'transparent',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: 'var(--surface-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={CATEGORY_ICON[r.category] as never} size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      {r.subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</div>}
                    </div>
                    <span className="badge" style={{ flexShrink: 0, fontSize: 10 }}>{CATEGORY_LABEL[r.category]}</span>
                    {active && <Icon name="arrowRight" size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />}
                  </div>
                )
              })}
            </>
          )}

          {/* No results */}
          {query.trim() && !loading && results.length === 0 && filteredPages.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No results for <strong style={{ color: 'var(--ink)' }}>"{query}"</strong>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', gap: 16, padding: '8px 16px',
          borderTop: '1px solid var(--rule)',
          fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
        }}>
          <span><span className="kbd" style={{ fontSize: 10 }}>↑↓</span> navigate</span>
          <span><span className="kbd" style={{ fontSize: 10 }}>↵</span> open</span>
          <span><span className="kbd" style={{ fontSize: 10 }}>Esc</span> close</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
