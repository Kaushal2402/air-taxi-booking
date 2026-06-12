import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

interface CreateOption {
  title: string
  description: string
  icon: string
  href: string
  accent?: boolean
}

const OPTIONS: CreateOption[] = [
  {
    title: 'Road Booking',
    description: 'Create an assisted road booking on behalf of a customer',
    icon: 'car',
    href: '/bookings/road/new',
    accent: true,
  },
  {
    title: 'Air Booking',
    description: 'Book an air taxi or charter flight for a customer',
    icon: 'plane',
    href: '/bookings/air/new',
    accent: true,
  },
  {
    title: 'Onboard Driver',
    description: 'Start the driver registration and KYC workflow',
    icon: 'user',
    href: '/drivers/onboarding',
  },
  {
    title: 'Onboard Operator',
    description: 'Register a new fleet operator and assign aircraft',
    icon: 'briefcase',
    href: '/operators/onboarding',
  },
  {
    title: 'Add Vendor',
    description: 'Register a new vehicle vendor or fleet partner',
    icon: 'building',
    href: '/vendors/new',
  },
  {
    title: 'Create Promotion',
    description: 'Set up a coupon, discount rule or referral campaign',
    icon: 'flag',
    href: '/promotions',
  },
  {
    title: 'Send Notification',
    description: 'Compose and dispatch a push or SMS notification',
    icon: 'bell',
    href: '/notifications',
  },
]

interface QuickCreateModalProps {
  open: boolean
  onClose: () => void
}

export default function QuickCreateModal({ open, onClose }: QuickCreateModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const go = (href: string) => {
    navigate(href)
    onClose()
  }

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
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1001,
        width: '100%', maxWidth: 680,
        background: 'var(--surface)',
        border: '1px solid var(--rule-strong)',
        borderRadius: 10,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '76vh',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--rule)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400,
              letterSpacing: '-0.014em', color: 'var(--ink)',
            }}>
              Quick Create
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Choose what you'd like to create
            </div>
          </div>
          <button className="btn icon sm" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Cards grid */}
        <div style={{
          overflowY: 'auto',
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.href}
              onClick={() => go(opt.href)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 120ms, background 120ms',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--accent)'
                el.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--rule)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              {/* Icon bubble */}
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                background: opt.accent ? 'var(--accent)' : 'var(--surface-3)',
                border: opt.accent ? 'none' : '1px solid var(--rule-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  name={opt.icon as never}
                  size={18}
                  style={{ color: opt.accent ? '#fff' : 'var(--ink-2)' }}
                />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600,
                  color: 'var(--ink)', marginBottom: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {opt.title}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45,
                }}>
                  {opt.description}
                </div>
              </div>

              <Icon name="arrowRight" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 2 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--rule)',
          fontSize: 11, color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <span><span className="kbd" style={{ fontSize: 10 }}>Esc</span> close</span>
        </div>
      </div>
    </>
  )
}
