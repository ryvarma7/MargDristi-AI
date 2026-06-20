import { useMemo } from 'react';
import { Cluster } from '../../types';
import { useAppStore } from '../../store/appStore';
import useSimulate from '../../hooks/useSimulate';

const now = new Date();
const CURRENT_HOUR = now.getHours();
const CURRENT_DOW  = now.getDay();

function StatCell({
  label,
  value,
  color = 'var(--cyan)',
  unit,
}: {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      padding: '10px 12px',
    }}>
      <div style={{
        fontSize: 9,
        fontFamily: 'DM Sans',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'IBM Plex Mono',
        fontSize: 18,
        fontWeight: 500,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {unit && (
        <div style={{
          fontSize: 10,
          fontFamily: 'DM Sans',
          color: 'var(--text-faint)',
          marginTop: 3,
        }}>
          {unit}
        </div>
      )}
    </div>
  );
}

type Props = { cluster: Cluster | null };

export default function SimulatorPanel({ cluster }: Props) {
  const numOfficers    = useAppStore((s) => s.numOfficers);
  const setNumOfficers = useAppStore((s) => s.setNumOfficers);
  const selectCluster  = useAppStore((s) => s.selectCluster);

  const request = useMemo(
    () =>
      cluster
        ? { cluster_id: cluster.cluster_id, num_officers: numOfficers, hour: CURRENT_HOUR, day_of_week: CURRENT_DOW }
        : null,
    [cluster, numOfficers]
  );

  const { result, loading } = useSimulate(request);

  const sliderPct = ((numOfficers - 1) / 4) * 100;

  if (!cluster) {
    return (
      <div style={{
        height: '100%',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--border-active)" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="10" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="20" cy="20" r="3" fill="var(--text-faint)" />
        </svg>
        <div style={{
          color: 'var(--text-dim)',
          fontSize: 12,
          fontFamily: 'DM Sans',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 220,
        }}>
          Select a zone from the map or priority list to simulate enforcement.
        </div>
      </div>
    );
  }

  const TIER_COLOR: Record<string, string> = {
    'Tier 1': '#FF3B3B',
    'Tier 2': '#FF9500',
    'Tier 3': '#00C853',
  };

  const tierColor = TIER_COLOR[cluster.tier] ?? 'var(--blue)';
  const prevRate  = result ? Math.round(result.prevention_rate * 100) : null;

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
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
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Sans' }}>
          Enforcement Simulator
        </div>
        <button
          onClick={() => selectCluster(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Zone info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              background: tierColor,
              color: cluster.tier === 'Tier 3' ? '#06080F' : 'white',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 6px',
              fontFamily: 'DM Sans',
            }}>
              {cluster.tier}
            </div>
          </div>
          <div style={{
            fontSize: 15,
            fontFamily: 'DM Sans',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}>
            {cluster.zone_name}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            color: 'var(--cyan)',
          }}>
            Predicted today: {cluster.violation_count.toLocaleString()} violations
          </div>
        </div>

        {/* Officer slider */}
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: 'DM Sans',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            Deploy how many officers
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={numOfficers}
            className="md-slider"
            style={{
              '--slider-pct': `${sliderPct}%`,
            } as React.CSSProperties}
            onChange={(e) => setNumOfficers(Number(e.target.value))}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
          }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: numOfficers === n ? 'var(--cyan)' : 'var(--text-faint)',
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            color: 'var(--cyan)',
            textAlign: 'center',
            marginTop: 6,
          }}>
            {numOfficers} {numOfficers === 1 ? 'OFFICER' : 'OFFICERS'}
          </div>
        </div>

        {/* Results grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}>
          <StatCell
            label="Prevented"
            value={loading ? '…' : result?.violations_prevented ?? '—'}
            unit="violations"
          />
          <StatCell
            label="Congestion"
            value={loading ? '…' : result ? `↓${result.congestion_reduction_pct}%` : '—'}
            unit="reduction"
          />
          <StatCell
            label="Revenue"
            value={loading ? '…' : result ? `₹${result.revenue_inr.toLocaleString()}` : '—'}
            unit="est. fines"
          />
          <StatCell
            label="Time Saved"
            value={loading ? '…' : result ? `${result.commuter_minutes_saved}m` : '—'}
            unit="commuter mins"
          />
        </div>

        {prevRate !== null && (
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--purple)',
            textAlign: 'center',
          }}>
            {prevRate}% prevention rate · CIS impact reduced by {Math.round((result?.violations_prevented ?? 0) * 0.2)} pts
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <button style={{
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            height: 38,
            fontFamily: 'DM Sans',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--blue)')}
          >
            DEPLOY NOW
          </button>
          <button style={{
            background: 'transparent',
            color: 'var(--blue)',
            border: '1px solid var(--border-active)',
            height: 36,
            fontFamily: 'DM Sans',
            fontSize: 12,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}>
            SCHEDULE
          </button>
        </div>
      </div>
    </div>
  );
}
