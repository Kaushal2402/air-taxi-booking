import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'

export default function ProfilePage() {
  const isMobile = useIsMobile()
  const setAuth = useOperatorAuthStore(s => s.setAuth)
  const storeUser = useOperatorAuthStore(s => s.user)
  const accessToken = useOperatorAuthStore(s => s.accessToken)
  const refreshToken = useOperatorAuthStore(s => s.refreshToken)
  const qc = useQueryClient()

  const [name, setName] = useState(storeUser?.name ?? '')
  const [phone, setPhone] = useState(storeUser?.phone ?? '')
  const [saved, setSaved] = useState(false)

  const { data: me } = useQuery({
    queryKey: ['operator-me'],
    queryFn: () => operatorAuthService.getMe(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: () => operatorAuthService.updateMe({ name, phone: phone || undefined }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      if (accessToken && refreshToken && storeUser) {
        setAuth(
          {
            ...storeUser,
            name: updated.name,
            phone: updated.phone ?? null,
          },
          accessToken,
          refreshToken,
        )
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const displayUser = me ?? storeUser

  return (
    <Shell activeId="profile" breadcrumb="Settings" title="My Profile">
      <div style={{ padding: isMobile ? '20px 16px' : '32px 32px', maxWidth: 560 }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule)' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              Personal Information
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
              Update your name and contact details
            </p>
          </div>

          <div style={{ padding: '24px' }}>
            {saved && (
              <div style={{
                background: 'var(--ok-soft)',
                border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
                borderRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--ok)',
                marginBottom: 20,
              }}>
                Profile updated successfully.
              </div>
            )}

            {mutation.isError && (
              <div style={{
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                borderRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--danger)',
                marginBottom: 20,
              }}>
                Failed to update profile. Please try again.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="field">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                />
              </div>

              <div className="field">
                <label className="field-label">Email</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="email"
                    className="input"
                    value={displayUser?.email ?? ''}
                    disabled
                    style={{ flex: 1, color: 'var(--ink-3)', cursor: 'not-allowed' }}
                  />
                  <span className="badge info" style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                    Verified
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>
                  Email cannot be changed here. Contact support.
                </p>
              </div>

              <div className="field">
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid var(--rule)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}>
                <div>
                  <div className="t-label">Role</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2, textTransform: 'capitalize' }}>
                    {(displayUser as { operator_role?: string; role?: string })?.operator_role?.replace(/_/g, ' ')
                      ?? displayUser?.role?.replace(/_/g, ' ')
                      ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="t-label">Organisation</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                    {(displayUser as { operator_name?: string | null })?.operator_name ?? storeUser?.operatorName ?? '—'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                className="btn accent sm"
                disabled={mutation.isPending || !name.trim()}
                onClick={() => mutation.mutate()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={14} />
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
