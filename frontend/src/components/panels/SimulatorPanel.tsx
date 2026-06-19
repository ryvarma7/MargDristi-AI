import { useMemo } from 'react';
import { Cluster } from '../../types';
import { useAppStore } from '../../store/appStore';
import useSimulate from '../../hooks/useSimulate';
import Button from '../ui/Button';

const hour = new Date().getHours();
const dayOfWeek = new Date().getDay();

type Props = {
  cluster: Cluster | null;
};

export default function SimulatorPanel({ cluster }: Props) {
  const numOfficers = useAppStore((state) => state.numOfficers);
  const setNumOfficers = useAppStore((state) => state.setNumOfficers);
  const request = useMemo(
    () =>
      cluster
        ? {
            cluster_id: cluster.cluster_id,
            num_officers: numOfficers,
            hour,
            day_of_week: dayOfWeek,
          }
        : null,
    [cluster, numOfficers]
  );

  const { result, loading } = useSimulate(request);

  if (!cluster) {
    return (
      <div className="h-full bg-[var(--bg-surface)] border border-[var(--border)] p-4 flex items-center justify-center">
        <div className="text-sm text-[var(--text-dim)]">Select a zone from the map or priority list to simulate enforcement.</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--bg-surface)] border border-[var(--border)] p-4 flex flex-col justify-between">
      <div>
        <div className="text-[11px] uppercase text-[var(--text-dim)]">ENFORCEMENT SIMULATOR</div>
        <div className="mt-3 text-lg font-semibold">{cluster.zone_name}</div>
        <div className="mt-1 flex items-center gap-2 text-[var(--text-dim)] text-xs">
          <div>{cluster.tier}</div>
        </div>
        <div className="mt-2 mono text-[var(--cyan)] text-base">
          Predicted violations today: {cluster.violation_count}
        </div>

        <div className="mt-6">
          <div className="text-[11px] uppercase text-[var(--text-dim)]">DEPLOY HOW MANY OFFICERS</div>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={numOfficers}
              onChange={(event) => setNumOfficers(Number(event.target.value))}
              className="w-full"
            />
            <div className="mono text-[var(--cyan)] text-2xl">{numOfficers}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-elevated)] p-3" style={{ borderRadius: 0 }}>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">PREVENTED</div>
            <div className="mt-2 mono text-[var(--cyan)] text-xl">{loading ? '...' : result?.violations_prevented ?? 0}</div>
            <div className="text-[var(--text-dim)] text-[11px]">violations</div>
          </div>
          <div className="bg-[var(--bg-elevated)] p-3" style={{ borderRadius: 0 }}>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">CONGESTION</div>
            <div className="mt-2 mono text-[var(--cyan)] text-xl">{loading ? '...' : `${result?.congestion_reduction_pct ?? 0}%`}</div>
            <div className="text-[var(--text-dim)] text-[11px]">reduction</div>
          </div>
          <div className="bg-[var(--bg-elevated)] p-3" style={{ borderRadius: 0 }}>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">REVENUE</div>
            <div className="mt-2 mono text-[var(--cyan)] text-xl">{loading ? '...' : `₹${result?.revenue_inr ?? 0}`}</div>
            <div className="text-[var(--text-dim)] text-[11px]">est. fines</div>
          </div>
          <div className="bg-[var(--bg-elevated)] p-3" style={{ borderRadius: 0 }}>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">TIME SAVED</div>
            <div className="mt-2 mono text-[var(--cyan)] text-xl">{loading ? '...' : `${result?.commuter_minutes_saved ?? 0} min`}</div>
            <div className="text-[var(--text-dim)] text-[11px]">for commuters</div>
          </div>
        </div>

        <div className="mt-4 mono text-[var(--purple)] text-sm">
          CIS impact reduced by {loading ? '...' : result ? Math.round((result.violations_prevented ?? 0) * 0.2) : 0} points
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" fullWidth>
          Deploy Now
        </Button>
        <Button variant="ghost" fullWidth>
          Schedule
        </Button>
      </div>
    </div>
  );
}
