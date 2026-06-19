import { useEffect, useMemo, useState } from 'react';
import { getClusters, getHeatmap, getHourlyPattern } from '../api/endpoints';
import { Cluster, HourlyPoint } from '../types';
import NavBar from '../components/NavBar';
import Card from '../components/ui/Card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function renderGrid(matrix: Record<string, Record<number, number>>) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const maxValue = Math.max(...Object.values(matrix).flatMap((day) => Object.values(day)), 1);

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: '80px repeat(24, minmax(24px, 1fr))' }}>
        <div />
        {hours.map((hour) => (
          <div key={hour} className="text-[10px] text-[var(--text-dim)] text-center">
            {hour}
          </div>
        ))}
        {days.map((day) => (
          <>
            <div key={`${day}-label`} className="text-[10px] text-[var(--text-dim)] flex items-center justify-center">
              {day}
            </div>
            {hours.map((hour) => {
              const value = matrix[day]?.[hour] ?? 0;
              const opacity = value / maxValue;
              return (
                <div
                  key={`${day}-${hour}`}
                  className="h-8"
                  style={{ background: `rgba(255, 59, 59, ${opacity})` }}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function TemporalAnalysis() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    getClusters(undefined, 100).then(setClusters).catch(() => setClusters([]));
  }, []);

  useEffect(() => {
    const id = selectedId ?? undefined;

    getHourlyPattern(id).then(setHourly).catch(() => setHourly([]));
    getHeatmap(id).then((data) => setHeatmap(data.matrix)).catch(() => setHeatmap({}));
  }, [selectedId]);

  const selectedName = useMemo(() => {
    if (selectedId === null) {
      return 'CITY-WIDE';
    }
    const selected = clusters.find((item) => item.cluster_id === selectedId);
    return selected?.zone_name ?? 'CITY-WIDE';
  }, [clusters, selectedId]);

  const chartData = hourly.map((item) => ({ hour: item.hour, count: item.count }));

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text)]">
      <NavBar />
      <div className="p-4 space-y-4">
        <Card>
          <div className="text-[11px] uppercase text-[var(--text-dim)]">Cluster Selector</div>
          <select
            className="mt-3 w-full bg-[var(--bg-elevated)] border border-[var(--border)] p-3 text-[var(--text)]"
            value={selectedId ?? ''}
            onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">City-wide</option>
            {clusters.map((cluster) => (
              <option key={cluster.cluster_id} value={cluster.cluster_id}>
                {cluster.zone_name}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <div className="text-[13px] font-semibold">VIOLATION FREQUENCY BY HOUR — {selectedName}</div>
          <div className="text-[11px] text-[var(--text-dim)] mt-1">Hours 12:00–17:00 highlighted: peak traffic, lowest enforcement</div>
          <div className="mt-4 h-72">
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
          <div className="text-[13px] font-semibold">VIOLATION INTENSITY — DAY × HOUR</div>
          <div className="mt-4">{renderGrid(heatmap)}</div>
        </Card>
      </div>
    </div>
  );
}
