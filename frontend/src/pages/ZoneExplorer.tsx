import { useEffect, useMemo, useState } from 'react';
import { getClusters, getHourlyPattern } from '../api/endpoints';
import { Cluster, HourlyPoint } from '../types';
import NavBar from '../components/NavBar';
import Card from '../components/ui/Card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ZoneExplorer() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);

  useEffect(() => {
    getClusters(undefined, 100).then(setClusters).catch(() => setClusters([]));
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    getHourlyPattern(selectedId).then(setHourly).catch(() => setHourly([]));
  }, [selectedId]);

  const selectedCluster = useMemo(
    () => clusters.find((item) => item.cluster_id === selectedId) ?? clusters[0] ?? null,
    [clusters, selectedId]
  );

  useEffect(() => {
    if (!selectedCluster && clusters.length > 0) {
      setSelectedId(clusters[0].cluster_id);
    }
  }, [clusters, selectedCluster]);

  const chartData = hourly.map((item) => ({ hour: item.hour, count: item.count }));

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text)]">
      <NavBar />
      <div className="p-4 space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4" style={{ borderRadius: 0 }}>
          <label className="text-[11px] uppercase text-[var(--text-dim)]">Select Zone</label>
          <select
            className="mt-2 w-full bg-[var(--bg-elevated)] border border-[var(--border)] p-2 text-[var(--text)]"
            value={selectedCluster?.cluster_id ?? ''}
            onChange={(event) => setSelectedId(Number(event.target.value))}
          >
            {clusters.map((cluster) => (
              <option key={cluster.cluster_id} value={cluster.cluster_id}>
                {cluster.zone_name}
              </option>
            ))}
          </select>
        </div>

        {selectedCluster ? (
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: 'CIS Score', value: selectedCluster.avg_cis.toFixed(1), color: 'text-[var(--purple)]' },
              { label: 'Violations', value: selectedCluster.violation_count.toString(), color: 'text-[var(--cyan)]' },
              { label: 'Rank', value: '#1', color: 'text-[var(--cyan)]' },
              { label: 'Peak Hour', value: `${selectedCluster.peak_hour}:00`, color: 'text-[var(--cyan)]' },
              { label: 'Top Vehicle', value: selectedCluster.top_vehicle, color: 'text-[var(--text)]' },
            ].map((item) => (
              <Card key={item.label} className="text-sm">
                <div className="text-[11px] uppercase text-[var(--text-dim)]">{item.label}</div>
                <div className={`mt-2 mono text-xl ${item.color}`}>{item.value}</div>
              </Card>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">Violation Type Breakdown</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--text-dim)" tick={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                  <YAxis stroke="var(--text-dim)" tick={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <Bar dataKey="count" fill="var(--blue)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <div className="text-[11px] uppercase text-[var(--text-dim)]">Vehicle Type Breakdown</div>
            <div className="h-72 flex items-center justify-center text-[var(--text-dim)]">
              Chart unavailable in sample data
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
