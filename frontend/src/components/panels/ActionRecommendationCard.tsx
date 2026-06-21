import type { Cluster, ActionRecommendation } from '../../types';

const TIER_COLOR: Record<Cluster['tier'], string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp.toString().padStart(2, '0')}:00 ${period}`;
}

export function computeRecommendation(cluster: Cluster): ActionRecommendation {
  // Deterministic formula from real cluster data
  const tier = cluster.tier;
  const officers = tier === 'Tier 1' ? 4 : tier === 'Tier 2' ? 3 : 2;
  const windowStart = Math.max(cluster.peak_hour - 1, 0);
  const windowEnd   = Math.min(cluster.peak_hour + 2, 23);
  const violPrev    = Math.round(cluster.violation_count * (officers * 0.09));
  const congRed     = Math.round(Math.min(cluster.avg_cis * officers * 1.1, 32));
  // Confidence: higher for Tier 1, lower for Tier 3
  const baseConf    = tier === 'Tier 1' ? 82 : tier === 'Tier 2' ? 74 : 65;
  const confidence  = Math.min(baseConf + Math.round(cluster.risk_score / 60), 96);

  return {
    cluster_id: cluster.cluster_id,
    risk_tier: tier,
    officers_required: officers,
    window_start: fmtHour(windowStart),
    window_end: fmtHour(windowEnd),
    violations_prevented: violPrev,
    congestion_reduction_pct: congRed,
    confidence_pct: confidence,
  };
}

// Animated confidence ring
function ConfidenceRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const fill = ((100 - pct) / 100) * circ;
  const color = pct >= 80 ? '#00C853' : pct >= 65 ? '#FF9500' : '#FF3B3B';

  return (
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle
          cx={26} cy={26} r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 11,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

type Props = {
  cluster: Cluster;
  onViewReasoning?: () => void;
};

export default function ActionRecommendationCard({ cluster, onViewReasoning }: Props) {
  const rec = computeRecommendation(cluster);
  const tierColor = TIER_COLOR[rec.risk_tier];

  return (
    <div
      className="action-card-enter"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${tierColor}30`,
        borderLeft: `3px solid ${tierColor}`,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: 9,
            fontFamily: 'DM Sans',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 3,
          }}>
            Recommended Action
          </div>
          <div style={{
            fontSize: 16,
            fontFamily: 'IBM Plex Mono',
            fontWeight: 500,
            color: 'var(--cyan)',
          }}>
            Deploy {rec.officers_required} Officers
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, fontFamily: 'DM Sans', color: 'var(--text-faint)', marginBottom: 2 }}>CONFIDENCE</div>
            <ConfidenceRing pct={rec.confidence_pct} />
          </div>
        </div>
      </div>

      {/* Deployment window */}
      <div style={{
        background: 'rgba(0, 200, 255, 0.06)',
        border: '1px solid rgba(0, 200, 255, 0.15)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Window
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--cyan)', fontWeight: 500 }}>
          {rec.window_start} – {rec.window_end}
        </div>
      </div>

      {/* Expected impact grid */}
      <div>
        <div style={{
          fontSize: 9,
          fontFamily: 'DM Sans',
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Expected Impact
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-dim)', marginBottom: 3 }}>Violations Prevented</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, fontWeight: 500, color: '#00C853', lineHeight: 1 }}>
              {rec.violations_prevented}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-dim)', marginBottom: 3 }}>Congestion Reduction</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, fontWeight: 500, color: '#9B72FF', lineHeight: 1 }}>
              ↓{rec.congestion_reduction_pct}%
            </div>
          </div>
        </div>
      </div>

      {/* View reasoning link */}
      {onViewReasoning && (
        <button
          onClick={onViewReasoning}
          style={{
            background: 'rgba(155, 114, 255, 0.08)',
            border: '1px solid rgba(155, 114, 255, 0.22)',
            color: 'var(--purple)',
            fontFamily: 'DM Sans',
            fontSize: 11,
            fontWeight: 600,
            padding: '7px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            letterSpacing: '0.04em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(155, 114, 255, 0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(155, 114, 255, 0.08)')}
        >
          View AI Reasoning
        </button>
      )}
    </div>
  );
}
