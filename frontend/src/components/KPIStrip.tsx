import { Cluster } from '../types';

function formatBig(n: number): string {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const disp   = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${period}`;
}

type Props = { clusters: Cluster[] };

export default function KPIStrip({ clusters }: Props) {
  const sorted    = [...clusters].sort((a, b) => b.risk_score - a.risk_score);
  const tier1     = clusters.filter((c) => c.tier === 'Tier 1');
  const topCluster = sorted[0];
  const totalViol  = clusters.reduce((s, c) => s + c.violation_count, 0);
  const avgCis     = clusters.length
    ? clusters.reduce((s, c) => s + c.avg_cis, 0) / clusters.length
    : 0;
  const nextPeak  = tier1.length
    ? Math.min(...tier1.map((c) => c.peak_hour))
    : topCluster?.peak_hour ?? 0;

  const kpis = [
    {
      label: 'ACTIVE TIER 1',
      value: tier1.length.toString(),
      color: 'var(--tier1)',
      sub: 'deploy-now zones',
    },
    {
      label: 'TOP RISK ZONE',
      value: (topCluster?.zone_name ?? '—').slice(0, 18),
      color: 'var(--cyan)',
      sub: topCluster ? `Risk ${topCluster.risk_score.toFixed(0)}` : '—',
      small: true,
    },
    {
      label: 'NEXT PEAK',
      value: fmtHour(nextPeak),
      color: 'var(--cyan)',
      sub: 'estimated from Tier 1',
    },
    {
      label: 'AVG CIS SCORE',
      value: avgCis.toFixed(2),
      color: 'var(--purple)',
      sub: 'congestion impact',
    },
    {
      label: 'TOTAL VIOLATIONS',
      value: formatBig(totalViol),
      color: 'var(--cyan)',
      sub: 'in dataset',
    },
  ];

  return (
    <div style={{
      height: 76,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      {kpis.map((k, i) => (
        <div
          key={k.label}
          style={{
            flex: 1,
            borderRight: i < kpis.length - 1 ? '1px solid var(--border)' : 'none',
            padding: '10px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{
            fontSize: 10,
            fontFamily: 'DM Sans',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            {k.label}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: k.small ? 14 : 20,
            fontWeight: 500,
            color: k.color,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {clusters.length === 0 ? '—' : k.value}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-faint)',
            fontFamily: 'DM Sans',
            marginTop: 2,
          }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
