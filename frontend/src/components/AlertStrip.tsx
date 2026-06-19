import { Cluster } from '../types';

const messageForTier = (cluster: Cluster): string => {
  if (cluster.tier === 'Tier 1') {
    return `${cluster.zone_name} — Peak window approaching (${cluster.peak_hour % 12 === 0 ? 12 : cluster.peak_hour % 12}:00 ${cluster.peak_hour < 12 ? 'AM' : 'PM'}). No officer assigned.`;
  }
  return `${cluster.zone_name} — Violation rate above average. Consider deployment.`;
};

const tickerKeyframes = `
  @keyframes ticker-scroll {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
`;

export default function AlertStrip({ clusters }: { clusters: Cluster[] }) {
  const alerts = clusters
    .filter((cluster) => cluster.tier === 'Tier 1')
    .slice(0, 3)
    .map((cluster) => ({
      tier: cluster.tier,
      text: messageForTier(cluster),
    }));

  return (
    <div className="relative overflow-hidden bg-[#0D1525] border-t border-[var(--border)] h-9">
      <style>{tickerKeyframes}</style>
      <div
        className="absolute whitespace-nowrap py-2 animate-[ticker-scroll_18s_linear_infinite]"
        style={{
          display: 'inline-flex',
          gap: '50px',
        }}
      >
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                alert.tier === 'Tier 1' ? 'bg-[var(--tier1)]' : 'bg-[var(--tier2)]'
              }`}
            />
            <span>{alert.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
