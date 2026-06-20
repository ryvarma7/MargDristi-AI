import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { getClusters, getGeoHeatmapPoints, getHourlyPattern } from '../api/endpoints';
import type { Cluster, HourlyPoint } from '../types';
import NavBar from '../components/NavBar';

// ── leaflet.heat type shim ────────────────────────────────────────────────────
declare module 'leaflet' {
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<string, string>;
    }
  ): L.Layer & { setLatLngs(latlngs: [number, number, number?][]): void };
}

const BENGALURU: [number, number] = [12.9716, 77.5946];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Subtle gradient — keep map readable, colors only bloom at true hotspots
const GRADIENT = {
  0.0:  'rgba(0,0,0,0)',
  0.15: 'rgba(0,180,80,0.15)',   // near-invisible green
  0.35: 'rgba(0,180,80,0.45)',   // soft green
  0.55: 'rgba(255,149,0,0.55)',  // amber
  0.75: 'rgba(220,50,30,0.65)',  // muted red
  1.0:  'rgba(255,30,30,0.82)',  // red only at true peaks
};

// ── HeatLayer inner component ─────────────────────────────────────────────────
function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const layerRef = useRef<(L.Layer & { setLatLngs: Function }) | null>(null);

  useEffect(() => {
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    if (points.length === 0) return;

    const layer = L.heatLayer(points, {
      radius: 22,
      blur: 28,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.0,
      gradient: GRADIENT,
    });
    layer.addTo(map);
    layerRef.current = layer;
    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
  }, [map, points]);

  return null;
}

// ── Zone info card (bottom-left of map) ──────────────────────────────────────
function InfoOverlay({ cluster }: { cluster: Cluster | null }) {
  if (!cluster) return null;
  const TIER_COLOR: Record<string, string> = { 'Tier 1': '#FF3B3B', 'Tier 2': '#FF9500', 'Tier 3': '#00C853' };
  const tc = TIER_COLOR[cluster.tier] ?? 'var(--cyan)';
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 2000,
      background: 'rgba(8,12,24,0.88)', border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${tc}`, borderRadius: 10, padding: '10px 14px',
      fontFamily: 'DM Sans', minWidth: 210, pointerEvents: 'none',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 5 }}>{cluster.zone_name}</div>
      <div style={{ fontSize: 10, lineHeight: 1.8, color: 'var(--text-dim)' }}>
        <div><span style={{ color: 'var(--cyan)' }}>Violations</span>: {cluster.violation_count.toLocaleString()}</div>
        <div><span style={{ color: 'var(--cyan)' }}>Avg CIS</span>: {cluster.avg_cis.toFixed(2)}</div>
        <div><span style={{ color: 'var(--cyan)' }}>Risk</span>: {cluster.risk_score.toFixed(0)}</div>
        <div><span style={{ color: tc }}>●</span> {cluster.tier}</div>
      </div>
    </div>
  );
}

// ── Density legend (bottom-right of map) ─────────────────────────────────────
function Legend({ count }: { count: number }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 2000,
      background: 'rgba(8,12,24,0.88)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', minWidth: 180,
      pointerEvents: 'none', backdropFilter: 'blur(6px)',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
        Violation Density
      </div>
      <div style={{ height: 8, borderRadius: 999, marginBottom: 5,
        background: 'linear-gradient(90deg, rgba(0,180,80,0.5) 0%, rgba(255,149,0,0.65) 50%, rgba(220,50,30,0.82) 100%)',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-faint)' }}>
        <span>Low</span><span>Medium</span><span>High</span>
      </div>
      {count > 0 && (
        <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono' }}>
          {count.toLocaleString()} pts
        </div>
      )}
    </div>
  );
}

// ── Bar chart tooltip ─────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const blind = (label ?? 0) >= 12 && (label ?? 0) <= 17;
  const h = label ?? 0;
  const period = h < 12 ? 'AM' : 'PM';
  const disp = h % 12 === 0 ? 12 : h % 12;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: `1px solid ${blind ? 'rgba(255,59,59,0.4)' : 'var(--border-active)'}`,
      padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)', borderRadius: 6,
    }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 3 }}>
        {disp}:00 {period}{blind && <span style={{ color: '#FF3B3B', marginLeft: 8 }}>⚠ BLINDSPOT</span>}
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono', color: blind ? '#FF3B3B' : 'var(--cyan)' }}>
        {payload[0].value.toLocaleString()} violations
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TemporalAnalysis() {
  const [clusters, setClusters]   = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [points, setPoints]       = useState<[number, number, number][]>([]);
  const [hourly, setHourly]       = useState<HourlyPoint[]>([]);
  const [heatLoading, setHeatLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const selectedCluster = selectedId === null ? null : clusters.find((c) => c.cluster_id === selectedId) ?? null;
  const zoneName = selectedCluster?.zone_name ?? 'CITY-WIDE';

  const TIER_COLOR: Record<string, string> = { 'Tier 1': '#FF3B3B', 'Tier 2': '#FF9500', 'Tier 3': '#00C853' };

  // Cluster list
  useEffect(() => {
    getClusters(undefined, 150)
      .then((d) => setClusters([...d].sort((a, b) => b.risk_score - a.risk_score)))
      .catch(() => setClusters([]));
  }, []);

  // Heatmap points
  const loadPoints = useCallback(async (id: number | null) => {
    setHeatLoading(true); setError(null);
    try { setPoints(await getGeoHeatmapPoints(id ?? undefined, 3000)); }
    catch { setError('Heatmap data unavailable'); setPoints([]); }
    finally { setHeatLoading(false); }
  }, []);

  // Hourly pattern
  const loadHourly = useCallback(async (id: number | null) => {
    setChartLoading(true);
    try { setHourly(await getHourlyPattern(id ?? undefined)); }
    catch { setHourly([]); }
    finally { setChartLoading(false); }
  }, []);

  useEffect(() => { loadPoints(selectedId); loadHourly(selectedId); }, [selectedId]);

  const chartData = useMemo(() => {
    const map: Record<number, number> = {};
    hourly.forEach((h) => { map[h.hour] = h.count; });
    return HOURS.map((h) => ({ hour: h, count: map[h] ?? 0 }));
  }, [hourly]);

  const peakHour = useMemo(() => chartData.reduce((p, c) => c.count > p.count ? c : p, chartData[0]), [chartData]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <NavBar />

      {/* ── Control bar ── */}
      <div style={{
        height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
          Geographic Analysis
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>Zone</span>
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: 300, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 12, fontFamily: 'DM Sans', height: 32,
            padding: '0 10px', outline: 'none', cursor: 'pointer', borderRadius: 6,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        >
          <option value="">City-wide (all clusters)</option>
          {clusters.map((c, i) => (
            <option key={c.cluster_id} value={c.cluster_id}>#{i + 1} — {c.zone_name}</option>
          ))}
        </select>

        {selectedCluster && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 999,
            background: `${TIER_COLOR[selectedCluster.tier]}18`,
            border: `1px solid ${TIER_COLOR[selectedCluster.tier]}44`,
            fontSize: 11, fontFamily: 'IBM Plex Mono', color: TIER_COLOR[selectedCluster.tier],
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TIER_COLOR[selectedCluster.tier] }} />
            {selectedCluster.tier} · Risk {selectedCluster.risk_score.toFixed(0)}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {(heatLoading || chartLoading) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)', animation: 'tier1-pulse 1s ease-in-out infinite' }} />
              LOADING
            </div>
          )}
          {error && <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--tier1)' }}>{error}</div>}
          {!heatLoading && points.length > 0 && (
            <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
              {points.length.toLocaleString()} pts
            </div>
          )}
        </div>
      </div>

      {/* ── Body: map (60%) + chart (40%) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* MAP */}
        <div style={{ flex: '0 0 60%', position: 'relative', overflow: 'hidden' }}>
          <MapContainer
            center={selectedCluster ? [selectedCluster.centroid_lat, selectedCluster.centroid_lng] : BENGALURU}
            zoom={selectedCluster ? 14 : 12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
            key={selectedId ?? 'city'}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
            <HeatLayer points={points} />
          </MapContainer>

          <InfoOverlay cluster={selectedCluster} />
          <Legend count={points.length} />

          {!heatLoading && points.length === 0 && !error && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              zIndex: 2000, pointerEvents: 'none', fontSize: 11,
              fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)', letterSpacing: '0.1em',
            }}>
              NO DATA
            </div>
          )}
        </div>

        {/* HOURLY BAR CHART */}
        <div style={{
          flex: '0 0 40%', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Chart header */}
          <div style={{
            padding: '10px 20px 0', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.06em' }}>
                VIOLATION FREQUENCY BY HOUR — {zoneName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 2 }}>
                Hours 12:00–17:00 highlighted · enforcement blindspot window
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>
                <span style={{ width: 9, height: 9, background: 'var(--blue)', display: 'inline-block', borderRadius: 2 }} />
                Normal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-faint)' }}>
                <span style={{ width: 9, height: 9, background: 'rgba(255,59,59,0.65)', display: 'inline-block', borderRadius: 2 }} />
                Blindspot
              </div>
              {peakHour && (
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
                  Peak {peakHour.hour % 12 === 0 ? 12 : peakHour.hour % 12}:00 {peakHour.hour < 12 ? 'AM' : 'PM'} · {peakHour.count.toLocaleString()} violations
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: '8px 12px 10px' }}>
            {chartLoading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                LOADING…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    stroke="var(--border)"
                    tickLine={false}
                    interval={0}
                    tick={({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => {
                      const h = payload.value;
                      const blind = h >= 12 && h <= 17;
                      const labels: Record<number, string> = { 0: '12A', 6: '6A', 12: '12P', 18: '6P', 23: '11P' };
                      if (!labels[h]) return <g />;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={12} textAnchor="middle"
                            fill={blind ? '#FF3B3B' : 'var(--text-dim)'}
                            fontSize={9} fontFamily="IBM Plex Mono">
                            {labels[h]}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis
                    stroke="none"
                    tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono', fill: 'var(--text-dim)' }}
                    width={40}
                  />
                  <RechartsTooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <ReferenceLine x={12} stroke="rgba(255,59,59,0.15)" strokeWidth={24} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={20}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.hour >= 12 && d.hour <= 17 ? 'rgba(255,59,59,0.65)' : 'var(--blue)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
