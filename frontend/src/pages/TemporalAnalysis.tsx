import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { getClusters, getHourlyPattern, getHeatmap } from '../api/endpoints';
import { Cluster, HourlyPoint } from '../types';
import NavBar from '../components/NavBar';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourLabel({ h }: { h: number }) {
  if (h === 0)  return <>12AM</>;
  if (h === 6)  return <>6AM</>;
  if (h === 12) return <>12PM</>;
  if (h === 18) return <>6PM</>;
  if (h === 23) return <>11PM</>;
  return null;
}

const CustomBarTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  const isBlindspot = (label ?? 0) >= 12 && (label ?? 0) <= 17;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${isBlindspot ? 'var(--tier1)' : 'var(--border-active)'}`,
      padding: '8px 12px',
      fontFamily: 'DM Sans',
      fontSize: 12,
      color: 'var(--text)',
    }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 3 }}>
        {label}:00 {(label ?? 0) < 12 ? 'AM' : 'PM'}
        {isBlindspot && (
          <span style={{ color: 'var(--tier1)', marginLeft: 8 }}>⚠ BLINDSPOT HOUR</span>
        )}
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono', color: isBlindspot ? 'var(--tier1)' : 'var(--cyan)' }}>
        {payload[0].value.toLocaleString()} violations
      </div>
    </div>
  );
};

export default function TemporalAnalysis() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, Record<number, number>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getClusters(undefined, 150)
      .then((data) => setClusters([...data].sort((a, b) => b.risk_score - a.risk_score)))
      .catch(() => setClusters([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const id = selectedId ?? undefined;
    Promise.all([
      getHourlyPattern(id).catch(() => [] as HourlyPoint[]),
      getHeatmap(id).then((r) => r.matrix).catch(() => ({} as Record<string, Record<number, number>>)),
    ]).then(([h, hm]) => {
      setHourly(h);
      setHeatmap(hm);
    }).finally(() => setLoading(false));
  }, [selectedId]);

  const selectedName = useMemo(() => {
    if (selectedId === null) return 'CITY-WIDE';
    return clusters.find((c) => c.cluster_id === selectedId)?.zone_name ?? 'CITY-WIDE';
  }, [clusters, selectedId]);

  // Build chart data with 24 hours guaranteed
  const chartData = useMemo(() => {
    const byHour: Record<number, number> = {};
    hourly.forEach((h) => { byHour[h.hour] = h.count; });
    return HOURS.map((h) => ({ hour: h, count: byHour[h] ?? 0 }));
  }, [hourly]);

  // Heatmap: compute max for normalization
  const heatmapMax = useMemo(() => {
    let max = 0;
    Object.values(heatmap).forEach((day) => {
      Object.values(day).forEach((v) => { if (v > max) max = v; });
    });
    return max || 1;
  }, [heatmap]);

  // Color for heatmap cell
  function cellColor(value: number): string {
    if (value === 0) return 'transparent';
    const t = value / heatmapMax;
    if (t < 0.25) return `rgba(0, 200, 83, ${0.15 + t * 0.5})`;  // green tones
    if (t < 0.55) return `rgba(255, 149, 0, ${0.25 + t * 0.5})`;  // amber tones
    return `rgba(255, 59, 59, ${0.3 + t * 0.7})`;                 // red tones
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <NavBar />

      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Selector */}
        <div style={{
          background: 'var(--bg-surface)',
          borderLeft: '3px solid var(--blue)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            fontSize: 10,
            fontFamily: 'DM Sans',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            CLUSTER
          </div>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'DM Sans',
              height: 36,
              padding: '0 12px',
              outline: 'none',
              cursor: 'pointer',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          >
            <option value="">City-wide (all clusters)</option>
            {clusters.map((c, i) => (
              <option key={c.cluster_id} value={c.cluster_id}>
                #{i + 1} — {c.zone_name}
              </option>
            ))}
          </select>
        </div>

        {/* Hourly Pattern Chart */}
        <div style={{
          background: 'var(--bg-surface)',
          borderLeft: '3px solid var(--cyan)',
          padding: '20px 24px',
        }}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>
              VIOLATION FREQUENCY BY HOUR — {selectedName}
            </div>
            <div style={{
              fontSize: 10,
              fontFamily: 'DM Sans',
              color: 'var(--text-dim)',
              marginTop: 4,
              display: 'flex',
              gap: 20,
              alignItems: 'center',
            }}>
              <span>Hours 12:00–17:00 highlighted: peak traffic, lowest enforcement</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: 'var(--blue)', display: 'inline-block' }} /> Normal hours
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: 'var(--tier1)', display: 'inline-block', opacity: 0.7 }} /> Enforcement blindspot
              </span>
            </div>
          </div>

          <div style={{ height: 280, marginTop: 20 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                LOADING…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    stroke="var(--border)"
                    tick={({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={12}
                          textAnchor="middle"
                          fill={payload.value >= 12 && payload.value <= 17 ? 'var(--tier1)' : 'var(--text-dim)'}
                          fontSize={9}
                          fontFamily="IBM Plex Mono"
                        >
                          <HourLabel h={payload.value} />
                        </text>
                      </g>
                    )}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="none"
                    tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: 'var(--text-dim)' }}
                    width={42}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <ReferenceLine
                    x={12}
                    stroke="var(--tier1)"
                    strokeOpacity={0.3}
                    strokeWidth={0}
                  />
                  <Bar dataKey="count" radius={0}>
                    {chartData.map((d, idx) => (
                      <Cell
                        key={idx}
                        fill={d.hour >= 12 && d.hour <= 17 ? 'rgba(255,59,59,0.65)' : 'var(--blue)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div style={{
          background: 'var(--bg-surface)',
          borderLeft: '3px solid var(--purple)',
          padding: '20px 24px',
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>
              VIOLATION INTENSITY — DAY × HOUR
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 3 }}>
              Color intensity = violation frequency. Darker red = more violations.
            </div>
          </div>

          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
              LOADING…
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '44px repeat(24, 1fr)',
                gap: 2,
                minWidth: 700,
              }}>
                {/* Column header */}
                <div />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      textAlign: 'center',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                      color: h >= 12 && h <= 17 ? 'var(--tier1)' : 'var(--text-faint)',
                      paddingBottom: 4,
                    }}
                  >
                    {h % 2 === 0 ? h : ''}
                  </div>
                ))}

                {/* Rows */}
                {DAYS.map((day) => (
                  <>
                    <div
                      key={`${day}-label`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 8,
                        fontFamily: 'IBM Plex Mono',
                        fontSize: 10,
                        color: 'var(--text-dim)',
                      }}
                    >
                      {day}
                    </div>
                    {HOURS.map((h) => {
                      const val = heatmap[day]?.[h] ?? 0;
                      const bg  = cellColor(val);
                      return (
                        <div
                          key={`${day}-${h}`}
                          title={`${day} ${h}:00 → ${val} violations`}
                          style={{
                            height: 28,
                            background: bg,
                            border: '1px solid rgba(26,40,64,0.5)',
                            transition: 'opacity 0.15s',
                            cursor: 'default',
                          }}
                        />
                      );
                    })}
                  </>
                ))}

                {/* Bottom hour labels (sparse) */}
                <div />
                {HOURS.map((h) => (
                  <div
                    key={`lbl-${h}`}
                    style={{
                      textAlign: 'center',
                      fontSize: 8,
                      fontFamily: 'IBM Plex Mono',
                      color: 'var(--text-faint)',
                      paddingTop: 3,
                    }}
                  >
                    {h === 0 ? '12A' : h === 12 ? '12P' : h === 18 ? '6P' : h === 23 ? '11P' : ''}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>LOW</span>
                {[0.05, 0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => (
                  <div
                    key={i}
                    style={{
                      width: 20,
                      height: 12,
                      background: cellColor(Math.round(t * heatmapMax)),
                      border: '1px solid var(--border)',
                    }}
                  />
                ))}
                <span style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>HIGH</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
