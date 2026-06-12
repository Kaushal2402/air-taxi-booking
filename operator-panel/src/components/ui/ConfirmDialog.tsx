import type React from 'react'
import { AlertTriangle, Shield, RefreshCw } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,24,20,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
        animation: 'fadeIn 120ms ease',
      }}
      onClick={() => { if (!loading) onCancel() }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '28px 28px 24px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'dialogIn 160ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isDanger ? 'var(--danger-soft)' : 'var(--surface-2)',
            border: `1px solid ${isDanger ? 'color-mix(in oklab, var(--danger) 28%, var(--rule-strong))' : 'var(--rule-strong)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isDanger
              ? <AlertTriangle size={16} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              : <Shield size={16} strokeWidth={2} style={{ color: 'var(--ink-2)' }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '-0.014em',
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}>
              {title}
            </h3>
            <p style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'var(--ink-3)',
              lineHeight: 1.55,
            }}>
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 24,
        }}>
          <button
            className="btn sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn sm${isDanger ? ' danger' : ' primary'}`}
            style={isDanger ? {
              background: 'var(--danger)',
              color: '#fff',
              borderColor: 'var(--danger)',
            } : {}}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Working…
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
