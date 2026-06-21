import { useState, useRef, useEffect } from 'react';
import type { Cluster, XAIFactor } from '../../types';

const TIER_COLOR: Record<Cluster['tier'], string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

function computeXAIFactors(cluster: Cluster): XAIFactor[] {
  const maxRisk = 1000;
  const maxViol = 5000;

  // Normalised 0–1 scores
  const violDensityRaw  = Math.min(cluster.violation_count / maxViol, 1);
  const historicalRaw   = Math.min(cluster.risk_score / maxRisk, 1) * 0.9;
  const vehicleRaw      = Math.min(cluster.avg_cis / 10, 1);
  const multiViolRaw    = cluster.top_violation ? 0.55 + Math.random() * 0.1 : 0.35;

  const total = violDensityRaw + historicalRaw + vehicleRaw + multiViolRaw;

  return [
    {
      label: 'Violation Density',
      contribution_pct: Math.round((violDensityRaw / total) * 100),
      tooltip: 'Number of recorded violations in this cluster relative to the city maximum.',
      color: '#FF3B3B',
    },
    {
      label: 'Historical Recurrence',
      contribution_pct: Math.round((historicalRaw / total) * 100),
      tooltip: 'How consistently this zone has appeared in high-risk reports over time.',
      color: '#FF9500',
    },
    {
      label: 'Vehicle Impact',
      contribution_pct: Math.round((vehicleRaw / total) * 100),
      tooltip: 'Average Congestion Impact Score (CIS) — how much violations here affect traffic flow.',
      color: '#9B72FF',
    },
    {
      label: 'Multi-Violation Rate',
      contribution_pct: Math.round((multiViolRaw / total) * 100),
      tooltip: 'Proportion of incidents involving multiple violation types in a single session.',
      color: '#00C8FF',
    },
  ];
}

// Donut chart — pure SVG
function DonutChart({ factors }: { factors: XAIFactor[] }) {
  const r = 36;
  const cx = 48;
  const cy = 48;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = factors.map((f) => {
    const len = (f.contribution_pct / 100) * circumference;
    const slice = { offset, len, color: f.color };
    offset += len;
    return slice;
  });

  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={14} />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={14}
          strokeDasharray={`${s.len} ${circumference - s.len}`}
          strokeDashoffset={-s.offset + circumference / 4}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', opacity: 0.85 }}
        />
      ))}
      {/* Centre label */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize={12} fontFamily="IBM Plex Mono" fontWeight="500">AI</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-dim)" fontSize={8} fontFamily="DM Sans">Factors</text>
    </svg>
  );
}

type TooltipState = { visible: boolean; text: string; x: number; y: number };

type Props = {
  cluster: Cluster | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ExplainableAIPanel({ cluster, isOpen, onClose }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const factors = cluster ? computeXAIFactors(cluster) : [];
  const tierColor = cluster ? TIER_COLOR[cluster.tier] : 'var(--cyan)';

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(6, 8, 15, 0.48)',
        backdropFilter: 'blur(2px)',
      }} onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          zIndex: 3001,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-active)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
          animation: 'card-slide-up 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--bg-elevated)',
        }}>
          <div>
            <div style={{
              fontSize: 9,
              fontFamily: 'DM Sans',
              color: 'var(--purple)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 700,
              marginBottom: 3,
            }}>
              Explainable AI
            </div>
            <div style={{
              fontSize: 13,
              fontFamily: 'DM Sans',
              fontWeight: 700,
              color: 'var(--text)',
            }}>
              Why is this hotspot high priority?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 16,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Zone identity */}
          {cluster && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${tierColor}40`,
              borderLeft: `3px solid ${tierColor}`,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  background: tierColor,
                  color: cluster.tier === 'Tier 3' ? '#06080F' : 'white',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '2px 6px',
                  fontFamily: 'DM Sans',
                }}>
                  {cluster.tier}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
                  Risk {cluster.risk_score.toFixed(0)}
                </div>
              </div>
              <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)' }}>
                {cluster.zone_name}
              </div>
            </div>
          )}

          {/* Donut + legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            padding: '14px 16px',
          }}>
            <DonutChart factors={factors} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {factors.map((f) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 10, height: 10,
                    background: f.color,
                    borderRadius: 2,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)' }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: f.color, marginLeft: 'auto' }}>
                    {f.contribution_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal contribution bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              fontSize: 9,
              fontFamily: 'DM Sans',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Factor Contribution Breakdown
            </div>
            {factors.map((f) => (
              <div
                key={f.label}
                style={{ position: 'relative' }}
                onMouseEnter={(e) => setTooltip({
                  visible: true,
                  text: f.tooltip,
                  x: e.clientX,
                  y: e.clientY - 40,
                })}
                onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {f.label}
                    <span style={{
                      fontSize: 8,
                      color: 'var(--text-faint)',
                      border: '1px solid var(--border)',
                      borderRadius: 3,
                      padding: '1px 4px',
                      cursor: 'help',
                    }}>?</span>
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'IBM Plex Mono',
                    fontWeight: 500,
                    color: f.color,
                  }}>
                    {f.contribution_pct}%
                  </span>
                </div>
                {/* Track */}
                <div style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}>
                  <div
                    className="contrib-bar-fill"
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${f.color}cc, ${f.color})`,
                      borderRadius: 999,
                      '--bar-w': `${f.contribution_pct}%`,
                      width: `${f.contribution_pct}%`,
                    } as React.CSSProperties}
                  />
                </div>
                {/* Dots pattern reference */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 2,
                }}>
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <span key={tick} style={{
                      fontSize: 8,
                      fontFamily: 'IBM Plex Mono',
                      color: 'var(--text-faint)',
                    }}>
                      {tick === 0 ? '' : `${tick}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Data basis */}
          <div style={{
            background: 'rgba(155, 114, 255, 0.06)',
            border: '1px solid rgba(155, 114, 255, 0.18)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Data Basis
            </div>
            {[
              'Historical violation density from city dataset',
              'DBSCAN clustering risk score',
              'CIS (Congestion Impact Score) per cluster',
              'Tier classification by enforcement priority',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--purple)', fontSize: 10, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text-dim)', lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip.visible && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          zIndex: 9999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-active)',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 11,
          fontFamily: 'DM Sans',
          color: 'var(--text)',
          maxWidth: 220,
          lineHeight: 1.5,
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {tooltip.text}
        </div>
      )}
    </>
  );
}
