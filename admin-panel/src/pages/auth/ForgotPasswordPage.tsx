import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BrandLockup from '../../components/layout/BrandLockup'
import Icon from '../../components/ui/Icon'
import { authService } from '../../services/authService'
import { useIsMobile } from '../../hooks/useIsMobile'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const isMobile = useIsMobile()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await authService.forgotPassword(data.email)
      setSentEmail(data.email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: isMobile ? '20px 24px' : '28px 40px', borderBottom: '1px solid var(--rule-soft)' }}>
        <BrandLockup />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : 40 }}>
        <div className="card" style={{
          width: isMobile ? '100%' : 480,
          maxWidth: 480,
          padding: isMobile ? '28px 20px' : '44px 48px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-2)',
        }}>
          {sent ? (
            <>
              <div style={{
                width: 44, height: 44, borderRadius: 4,
                background: 'var(--ok-soft)', color: 'var(--ok)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 22,
                border: '1px solid color-mix(in oklab, var(--ok) 25%, var(--rule-strong))',
              }}>
                <Icon name="envelope" size={20} />
              </div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 26, fontWeight: 400, letterSpacing: '-0.018em' }}>
                Check your inbox.
              </h2>
              <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                If <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{sentEmail}</span> is registered,
                we've sent a reset link. It expires in 40 minutes.
              </p>
              <Link to="/login">
                <button className="btn lg" style={{ marginTop: 28, width: '100%' }}>
                  <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} /> Back to sign in
                </button>
              </Link>
            </>
          ) : (
            <>
              <div className="t-label" style={{ marginBottom: 14 }}>Account recovery</div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 26, fontWeight: 400, letterSpacing: '-0.018em' }}>
                Reset your password.
              </h2>
              <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                Enter your work email and we'll send a password reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">Work email</label>
                  <div className={`input lg${errors.email ? ' error' : ''}`}>
                    <input {...register('email')} type="email" placeholder="you@acmemobility.io" autoComplete="email" />
                  </div>
                  {errors.email && <span className="field-error">{errors.email.message}</span>}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Link to="/login" style={{ flex: 1 }}>
                    <button type="button" className="btn lg" style={{ width: '100%' }}>Cancel</button>
                  </Link>
                  <button type="submit" disabled={loading} className="btn primary lg" style={{ flex: 2 }}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
