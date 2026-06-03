import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { brandingService } from '../../services/brandingService'
import type { BrandProfile, BrandAsset, BrandTouchpoint } from '../../services/brandingService'

export default function TouchpointsPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState<BrandProfile | null>(null)
  const [touchpoints, setTouchpoints] = useState<BrandTouchpoint[]>([])
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    try {
      const [profileData, tpData, assetData] = await Promise.all([
        brandingService.getProfile(profileId),
        brandingService.listTouchpoints(profileId),
        brandingService.listAssets(profileId),
      ])
      setProfile(profileData)
      setTouchpoints(tpData)
      setAssets(assetData)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { load() }, [load])

  async function toggleTouchpointStatus(tp: BrandTouchpoint) {
    const next = tp.status === 'live' ? 'review' : 'live'
    try {
      await brandingService.updateTouchpoint(tp.id, { status: next })
      await load()
    } catch {
      // ignore
    }
  }

  if (loading && !profile) {
    return (
      <Shell activeId="branding" title="Loading…">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-4)' }}>
          Loading touchpoints…
        </div>
      </Shell>
    )
  }

  if (!profile) return null

  return (
    <Shell
      activeId="branding"
      breadcrumb={`System · Branding · Touchpoints`}
      title="Brand touchpoints"
      subtitle={`${profile.name} · ${touchpoints.length} surfaces · CDN cache 12 min`}
      actions={
        <>
          <button className="btn sm" onClick={() => navigate(`/branding/${profileId}`)}>← Theme editor</button>
          <button className="btn sm">
            <Icon name="refresh" size={13} />Purge CDN cache
          </button>
          <button className="btn sm">
            <Icon name="download" size={13} />Asset kit
          </button>
        </>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Touchpoints grid */}
        {touchpoints.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {touchpoints.map(p => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: 40, height: 40, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Icon name={p.icon ?? 'globe'} size={18} />
                  </div>
                  {p.status === 'live'
                    ? <span className="badge ok"><span className="dot ok" />Live</span>
                    : p.status === 'review'
                    ? <span className="badge warn"><span className="dot warn" />Review</span>
                    : <span className="badge"><span className="dot pending" />Disabled</span>}
                </div>
                <div style={{ marginTop: 14, fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                {p.description && <div className="t-meta" style={{ marginTop: 4 }}>{p.description}</div>}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span className="t-meta">Coverage</span>
                    {p.coverage && <div style={{ fontSize: 12, fontWeight: 500 }}>{p.coverage}</div>}
                  </div>
                  <button className="btn sm ghost" onClick={() => toggleTouchpointStatus(p)}>
                    {p.status === 'live' ? 'Pause' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {touchpoints.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '32px 24px', textAlign: 'center' }}>
            <div className="t-meta">No touchpoints defined for this brand profile.</div>
            <div className="t-meta" style={{ marginTop: 8 }}>Touchpoints represent where the brand renders — apps, emails, PDFs, etc.</div>
          </div>
        )}

        {/* Asset library */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Asset library</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Published artifacts</h3>
            </div>
            <button className="btn sm" onClick={() => navigate(`/branding/${profileId}`)}>
              <Icon name="upload" size={13} />Upload asset
            </button>
          </div>
          {assets.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-4)' }}>
              No assets uploaded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Format</th>
                    {!isMobile && <th>Used in</th>}
                    <th>Version</th>
                    {!isMobile && <th style={{ textAlign: 'right' }}>Size</th>}
                    <th>Status</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 32, height: 32, border: '1px solid var(--rule)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                            <Icon name="layers" size={15} />
                          </div>
                          <span style={{ fontSize: 13 }}>{a.name}</span>
                        </div>
                      </td>
                      <td className="t-meta">{a.format ?? '—'}</td>
                      {!isMobile && <td className="t-meta">{a.used_in ?? '—'}</td>}
                      <td><span className="t-mono" style={{ fontSize: 12 }}>{a.version ?? 'v1'}</span></td>
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{a.file_size_kb ? `${a.file_size_kb} KB` : '—'}</td>}
                      <td>
                        {a.status === 'live'
                          ? <span className="badge ok"><span className="dot ok" />Live</span>
                          : a.status === 'stale'
                          ? <span className="badge warn"><span className="dot warn" />Stale</span>
                          : <span className="badge"><span className="dot pending" />{a.status}</span>}
                      </td>
                      <td>
                        {a.file_url ? (
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                            <button className="btn icon sm ghost"><Icon name="download" size={13} /></button>
                          </a>
                        ) : (
                          <button className="btn icon sm ghost" disabled><Icon name="download" size={13} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
