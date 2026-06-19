import { Cluster } from '../types';

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}K`;
  }
  return `${value}`;
}

type Props = {
  clusters: Cluster[];
};

export default function KPIStrip({ clusters }: Props) {
  const tier1Count = clusters.filter((cluster) => cluster.tier === 'Tier 1').length;
  const topCluster = clusters.sort((a, b) => b.risk_score - a.risk_score)[0];
  const avgCis = clusters.length
    ? clusters.reduce((sum, cluster) => sum + cluster.avg_cis, 0) / clusters.length
    : 0;
  const peakHour = topCluster?.peak_hour ?? 0;
  const peakLabel = `${peakHour % 12 === 0 ? 12 : peakHour % 12}:00 ${peakHour < 12 ? 'AM' : 'PM'}`;

  return (
    <div className="flex h-20 items-center gap-3 px-4 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      {[
        { label: 'ACTIVE TIER 1', value: tier1Count, valueClass: 'text-[var(--cyan)]' },
        { label: 'TOP RISK ZONE', value: topCluster?.zone_name ?? 'N/A', valueClass: 'text-[var(--cyan)]' },
        { label: 'PEAK IN', value: peakLabel, valueClass: 'text-[var(--cyan)]' },
        { label: 'AVG CIS SCORE', value: avgCis.toFixed(1), valueClass: 'text-[var(--purple)]' },
        { label: 'TOTAL VIOLATIONS', value: formatNumber(clusters.reduce((sum, cluster) => sum + cluster.violation_count, 0)), valueClass: 'text-[var(--cyan)]' },
      ].map((item) => (
        <div key={item.label} className="flex-1 border-r border-[var(--border)] last:border-r-0 px-3 py-2">
          <div className="text-[11px] uppercase text-[var(--text-dim)]">{item.label}</div>
          <div className={`mt-1 text-lg font-semibold mono ${item.valueClass}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
