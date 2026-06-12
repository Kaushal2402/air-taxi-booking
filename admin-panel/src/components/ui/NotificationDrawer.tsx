import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import type { AlertItem } from '../../services/adminAlertsService'
import { adminAlertsService } from '../../services/adminAlertsService'

// ── Category config ───────────────────────────────────────────────────────────

const CAT: Record<string, { icon: string; color: string; bg: string }> = {
  sos:      { icon: 'alert',     color: '#e53935', bg: '#fdecea' },
  dispute:  { icon: 'flag',      color: '#e65100', bg: '#fff3e0' },
  booking:  { icon: 'receipt',   color: '#0F8A5F', bg: '#e8f5e9' },
  driver:   { icon: 'user',      color: '#1565c0', bg: '#e3f2fd' },
  operator: { icon: 'briefcase', color: '#6a1b9a', bg: '#f3e5f5' },
  system:   { icon: 'settings',  color: '#546e7a', bg: '#eceff1' },
}

function catStyle(category: string) {
  return CAT[category] ?? CAT.system
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onUnreadChange: (count: number) => void
}

export default function NotificationDrawer({ open, onClose, onUnreadChange }: Props) {
  const navigate = useNavigate()
  const [items, setItems] = useState<AlertItem[]>([])
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 20

  const load = useCallback(async (p: number, reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const data = await adminAlertsService.list(p, PAGE_SIZE)
      setItems(prev => reset ? data.items : [...prev, ...data.items])
      setTotal(data.total)
      setUnread(data.unread)
      onUnreadChange(data.unread)
      setHasMore((reset ? data.items.length : items.length + data.items.length) < data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [loading, items.length, onUnreadChange])

  // Initial load when drawer opens
  useEffect(() => {
    if (open) load(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc to close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  // Infinite scroll — IntersectionObserver on sentinel div
  useEffect(() => {
    if (!open || !hasMore || loading) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) load(page + 1)
    }, { threshold: 0.1 })
    const el = bottomRef.current
    if (el) obs.observe(el)
    return () => { if (el) obs.unobserve(el) }
  }, [open, hasMore, loading, page, load])

  const handleMarkRead = async (item: AlertItem) => {
    if (item.is_read) return
    const updated = await adminAlertsService.markRead(item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_read: updated.is_read } : i))
    const newUnread = Math.max(0, unread - 1)
    setUnread(newUnread)
    onUnreadChange(newUnread)
  }

  const handleClick = async (item: AlertItem) => {
    await handleMarkRead(item)
    if (item.href) { navigate(item.href); onClose() }
  }

  const handleMarkAll = async () => {
    await adminAlertsService.markAllRead()
    setItems(prev => prev.map(i => ({ ...i, is_read: true })))
    setUnread(0)
    onUnreadChange(0)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.3)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
        width: 400, maxWidth: '100vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--rule-strong)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 180ms ease-out',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400,
              letterSpacing: '-0.014em', color: 'var(--ink)',
            }}>Notifications</span>
            {unread > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff',
                fontSize: 11, fontWeight: 600,
                borderRadius: 10, padding: '1px 7px',
                fontFamily: 'var(--font-mono)',
              }}>{unread}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unread > 0 && (
              <button className="btn ghost sm" onClick={handleMarkAll} style={{ fontSize: 12 }}>
                Mark all read
              </button>
            )}
            <button className="btn icon sm" onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '60%', gap: 10,
              color: 'var(--ink-3)',
            }}>
              <Icon name="bell" size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13 }}>No notifications yet</span>
            </div>
          )}

          {items.map(item => {
            const cs = catStyle(item.category)
            return (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 18px',
                  borderBottom: '1px solid var(--rule)',
                  cursor: item.href ? 'pointer' : 'default',
                  background: item.is_read ? 'transparent' : 'var(--surface-2)',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-3)' }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = item.is_read ? 'transparent' : 'var(--surface-2)'
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: cs.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <Icon name={cs.icon as never} size={16} style={{ color: cs.color }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: item.is_read ? 400 : 600,
                    color: 'var(--ink)', lineHeight: 1.4,
                    marginBottom: 2,
                  }}>
                    {item.title}
                  </div>
                  {item.body && (
                    <div style={{
                      fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {item.body}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11, color: 'var(--ink-3)',
                    fontFamily: 'var(--font-mono)', marginTop: 4,
                  }}>
                    {timeAgo(item.created_at)}
                  </div>
                </div>

                {/* Unread dot */}
                {!item.is_read && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0, marginTop: 5,
                  }} />
                )}
              </div>
            )
          })}

          {/* Infinite scroll sentinel */}
          <div ref={bottomRef} style={{ height: 1 }} />

          {loading && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div style={{
                width: 20, height: 20, border: '2px solid var(--rule-strong)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                margin: '0 auto',
              }} />
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <div style={{
              padding: '16px', textAlign: 'center',
              fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)',
            }}>
              {total} notification{total !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
