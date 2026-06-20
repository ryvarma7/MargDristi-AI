import { Cluster } from '../types';

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const disp   = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${period}`;
}

function buildAlerts(clusters: Cluster[]): { dot: string; text: string }[] {
  const tier1 = clusters
    .filter((c) => c.tier === 'Tier 1')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 4);

  const tier2 = clusters
    .filter((c) => c.tier === 'Tier 2')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3);

  const alerts: { dot: string; text: string }[] = [
    ...tier1.map((c) => ({
      dot: 'var(--tier1)',
      text: `${c.zone_name} — Peak window approaching (${fmtHour(c.peak_hour)}). No officer assigned. Risk: ${c.risk_score.toFixed(0)}`,
    })),
    ...tier2.map((c) => ({
      dot: 'var(--tier2)',
      text: `${c.zone_name} — Violation rate above average. Consider deployment. Risk: ${c.risk_score.toFixed(0)}`,
    })),
  ];

  return alerts.length ? alerts : [
    { dot: 'var(--tier2)', text: 'Connecting to MargDristi backend… Start uvicorn at localhost:8000' },
  ];
}

export default function AlertStrip({ clusters }: { clusters: Cluster[] }) {
  const alerts = buildAlerts(clusters);

  // Duplicate for seamless loop
  const doubled = [...alerts, ...alerts];

  return (
    <div style={{
      height: 36,
      background: '#0D1525',
      borderTop: '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      <div className="ticker-inner">
        {doubled.map((a, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontFamily: 'DM Sans',
            color: 'var(--text-dim)',
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: a.dot,
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {a.text}
          </span>
        ))}
      </div>
    </div>
  );
}
