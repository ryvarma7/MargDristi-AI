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
  const sorted = [...clusters].sort((a, b) => b.risk_score - a.risk_score).slice(0, 25);

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
        gridTemplateColumns: '28px 1fr 56px 48px',
        gap: '0 8px',
        padding: '6px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        {['#', 'ZONE', 'RISK', 'PEAK'].map((h) => (
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

            return (
              <button
                key={c.cluster_id}
                onClick={() => onSelect(c)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 56px 48px',
                  gap: '0 8px',
                  alignItems: 'center',
                  padding: '10px 14px',
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
              >
                {/* Rank */}
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 11,
                  color: 'var(--text-faint)',
                }}>
                  {i + 1}
                </div>

                {/* Zone name */}
                <div>
                  <div style={{
                    fontSize: 12,
                    fontFamily: 'DM Sans',
                    color: isSelected ? 'white' : 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}>
                    {c.zone_name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontFamily: 'DM Sans',
                    color: 'var(--text-faint)',
                    marginTop: 1,
                  }}>
                    {c.top_violation?.slice(0, 22) ?? '—'}
                  </div>
                </div>

                {/* Risk score */}
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--purple)',
                  textAlign: 'right',
                }}>
                  {c.risk_score.toFixed(0)}
                </div>

                {/* Peak */}
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'var(--cyan)',
                  textAlign: 'right',
                }}>
                  {fmtHour(c.peak_hour)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
