import { useState } from 'react';
import Badge from '../ui/Badge';
import { deploy as deployApi } from '../../api/endpoints';
import { Cluster } from '../../types';

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
};

export default function PriorityPanel({ clusters, selectedId, onSelect }: Props) {
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const sorted = [...clusters].sort((a, b) => b.risk_score - a.risk_score).slice(0, 25);

  const handleQuickDeploy = async (cluster: Cluster) => {
    setDeployingId(cluster.cluster_id);
    setNotification(null);
    try {
      await deployApi({ cluster_id: cluster.cluster_id, num_officers: 3 });
      setNotification(`3 officers deployed to ${cluster.zone_name}`);
    } catch (err) {
      setNotification(`Deployment failed to ${cluster.zone_name}`);
    } finally {
      setDeployingId(null);
      window.setTimeout(() => setNotification(null), 2800);
    }
  };

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: 10,
        fontFamily: 'DM Sans',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span>Enforcement Priorities</span>
        <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
          {sorted.length} zones
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 92px 110px',
        gap: '0 8px',
        padding: '6px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        {['#', 'ZONE', 'RISK', 'ACTION'].map((h) => (
          <div key={h} style={{
            fontSize: 9,
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
            const tierColor = TIER_COLOR[c.tier];
            const isPeakTraffic = c.peak_hour >= 12 && c.peak_hour <= 17;
            const isDeploying = deployingId === c.cluster_id;

            return (
              <div
                key={c.cluster_id}
                role="button"
                onClick={() => onSelect(c)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 92px 110px',
                  gap: '0 8px',
                  alignItems: 'center',
                  padding: '10px 14px',
                  minHeight: 52,
                  borderLeft: `3px solid ${tierColor}`,
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'var(--blue-dim)' : i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(c);
                }}
              >
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 11,
                  color: 'var(--text-faint)',
                }}>
                  {i + 1}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Badge tier={c.tier} />
                    <div style={{
                      fontSize: 12,
                      fontFamily: 'DM Sans',
                      color: isSelected ? 'white' : 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                      minWidth: 0,
                    }}>
                      {c.zone_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontFamily: 'DM Sans',
                    color: 'var(--text-faint)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.top_violation?.slice(0, 22) ?? '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--purple)',
                  }}>
                    {c.risk_score.toFixed(0)}
                  </div>
                  <div style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: 'var(--cyan)',
                    textAlign: 'right',
                  }}>
                    {c.violation_count.toLocaleString()} violations
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 10,
                      color: 'var(--cyan)',
                    }}>
                      {fmtHour(c.peak_hour)}
                    </div>
                    {isPeakTraffic ? (
                      <span
                        title="Peak traffic hours - usually unenforced"
                        style={{
                          width: 22,
                          height: 3,
                          background: 'var(--tier1)',
                          borderRadius: 999,
                          opacity: 0.75,
                        }}
                      />
                    ) : (
                      <span style={{ height: 3, display: 'block' }} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickDeploy(c);
                    }}
                    disabled={isDeploying}
                    style={{
                      background: isDeploying ? 'rgba(0, 200, 255, 0.14)' : 'rgba(0, 200, 255, 0.12)',
                      color: 'var(--cyan)',
                      border: '1px solid rgba(0, 200, 255, 0.22)',
                      borderRadius: 6,
                      padding: '6px 8px',
                      fontSize: 10,
                      fontFamily: 'IBM Plex Mono',
                      fontWeight: 700,
                      cursor: isDeploying ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isDeploying ? 'DEPLOYING' : 'DEPLOY 3'}
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
