import { Cluster } from '../../types';
import Badge from '../ui/Badge';

const tierBorder: Record<Cluster['tier'], string> = {
  'Tier 1': 'border-l-[var(--tier1)]',
  'Tier 2': 'border-l-[var(--tier2)]',
  'Tier 3': 'border-l-[var(--tier3)]',
};

type Props = {
  clusters: Cluster[];
  selectedId: number | null;
  onSelect: (cluster: Cluster) => void;
};

export default function PriorityPanel({ clusters, selectedId, onSelect }: Props) {
  const sorted = [...clusters].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);

  return (
    <div className="h-full bg-[var(--bg-surface)] border border-[var(--border)] p-3">
      <div className="mb-3 border-b border-[var(--border)] pb-2 text-[11px] uppercase text-[var(--text-dim)]">
        ENFORCEMENT PRIORITIES
      </div>
      <div className="space-y-2 overflow-y-auto pr-1 max-h-[calc(100%-44px)]">
        {sorted.map((cluster, index) => {
          const selected = selectedId === cluster.cluster_id;
          return (
            <button
              key={cluster.cluster_id}
              type="button"
              onClick={() => onSelect(cluster)}
              className={`w-full text-left ${tierBorder[cluster.tier]} border-l-4 p-3 ${
                selected ? 'bg-[var(--blue-dim)]' : 'bg-[var(--bg-surface)]'
              }`}
              style={{ borderRadius: 0 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[var(--text-dim)] text-[11px] uppercase">#{index + 1}</div>
                  <div className="text-sm font-medium">{cluster.zone_name}</div>
                </div>
                <Badge tier={cluster.tier} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="mono text-[var(--purple)] text-lg">{cluster.risk_score}</div>
                <div className="mono text-[var(--cyan)] text-xs">{cluster.peak_hour}:00</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
