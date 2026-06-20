import { useState } from 'react';
import Badge from '../ui/Badge';
import { deploy as deployApi } from '../../api/endpoints';
import { Cluster } from '../../types';
import { computeRecommendation } from './ActionRecommendationCard';

const TIER_COLOR: Record<Cluster['tier'], string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00`;
}

type Props = {
  clusters: Cluster[];
  selectedId: number | null;
  onSelect: (c: Cluster) => void;
  onViewReasoning?: (c: Cluster) => void;
  onSchedule?: (c: Cluster) => void;
};

export default function PriorityPanel({ clusters, selectedId, onSelect, onViewReasoning, onSchedule }: Props) {
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const sorted = [...clusters].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);

  const handleQuickDeploy = async (cluster: Cluster) => {
    const rec = computeRecommendation(cluster);
    setDeployingId(cluster.cluster_id);
    setNotification(null);
    try {
      await deployApi({ cluster_id: cluster.cluster_id, num_officers: rec.officers_required });
      setNotification(`DEPLOYED — ${rec.officers_required} officers to ${cluster.zone_name}`);
    } catch {
      setNotification(`FAILED — ${cluster.zone_name}`);
    } finally {
      setDeployingId(null);
      window.setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--bg-elevated)',
      }}>
        <div>
          <div style={{
            fontSize: 11,
            fontFamily: 'DM Sans',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '0.06em',
          }}>
            PRIORITY ACTION QUEUE
          </div>
          <div style={{
            fontSize: 9,
            fontFamily: 'IBM Plex Mono',
            color: 'var(--text-faint)',
            marginTop: 2,
          }}>
            Risk-ranked · {sorted.length} zones ready for action
          </div>
        </div>
        <div style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          color: 'var(--cyan)',
          background: 'rgba(0,200,255,0.08)',
          border: '1px solid rgba(0,200,255,0.18)',
          padding: '3px 8px',
        }}>
          LIVE
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div style={{
          padding: '8px 16px',
          background: notification.startsWith('DEPLOYED')
            ? 'rgba(0,200,83,0.1)'
            : 'rgba(255,59,59,0.1)',
          borderBottom: `1px solid ${notification.startsWith('DEPLOYED') ? 'rgba(0,200,83,0.2)' : 'rgba(255,59,59,0.2)'}`,
          fontSize: 11,
          fontFamily: 'DM Sans',
          color: notification.startsWith('DEPLOYED') ? '#00C853' : '#FF3B3B',
          flexShrink: 0,
        }}>
          {notification}
        </div>
      )}

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 56px 64px 72px 80px',
        gap: '0 6px',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        {['RNK', 'HOTSPOT', 'RISK', 'PEAK', 'OFFICERS', 'ACTION'].map((h) => (
          <div key={h} style={{
            fontSize: 8,
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'DM Sans',
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* Scrollable rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 13,
            fontFamily: 'DM Sans',
          }}>
            Waiting for data…
          </div>
        ) : (
          sorted.map((c, i) => {
            const isSelected = selectedId === c.cluster_id;
            const tierColor  = TIER_COLOR[c.tier];
            const isDeploying = deployingId === c.cluster_id;
            const rec = computeRecommendation(c);

            return (
              <div
                key={c.cluster_id}
                className="cq-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 56px 64px 72px 80px',
                  gap: '0 6px',
                  alignItems: 'center',
                  padding: '9px 12px',
                  minHeight: 56,
                  borderLeft: `3px solid ${tierColor}`,
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'var(--blue-dim)' : i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                }}
                onClick={() => onSelect(c)}
                role="button"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(c); }}
                tabIndex={0}
              >
                {/* Rank */}
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-faint)' }}>
                  {i + 1}
                </div>

                {/* Hotspot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <Badge tier={c.tier} />
                    <div style={{
                      fontSize: 11,
                      fontFamily: 'DM Sans',
                      color: isSelected ? 'white' : 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                    }}>
                      {c.zone_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontFamily: 'DM Sans',
                    color: 'var(--text-faint)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.top_violation?.slice(0, 20) ?? '—'}
                  </div>
                </div>

                {/* Risk */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 500, color: tierColor }}>
                    {c.risk_score.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>
                    {c.violation_count.toLocaleString()} v
                  </div>
                </div>

                {/* Peak time */}
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--cyan)' }}>
                  {fmtHour(c.peak_hour)}
                </div>

                {/* Officers needed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--purple)', fontWeight: 500 }}>
                    {rec.officers_required}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>
                    {rec.confidence_pct}% conf
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={isDeploying}
                    onClick={() => handleQuickDeploy(c)}
                    title="Deploy Now"
                    style={{
                      background: isDeploying ? 'rgba(30,111,255,0.1)' : 'rgba(30,111,255,0.18)',
                      color: isDeploying ? 'var(--text-faint)' : 'var(--blue)',
                      border: '1px solid rgba(30,111,255,0.3)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                      fontWeight: 700,
                      cursor: isDeploying ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {isDeploying ? '…' : 'DEPLOY'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSchedule?.(c)}
                    title="Schedule Deployment"
                    style={{
                      background: 'rgba(255,200,0,0.08)',
                      color: '#FFC800',
                      border: '1px solid rgba(255,200,0,0.22)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SCHED
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewReasoning?.(c)}
                    title="View AI Reasoning"
                    style={{
                      background: 'rgba(155,114,255,0.08)',
                      color: 'var(--purple)',
                      border: '1px solid rgba(155,114,255,0.22)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    WHY?
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
