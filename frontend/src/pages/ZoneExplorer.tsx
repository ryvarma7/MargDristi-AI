import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getClusters, getViolationTypes, getVehicleTypes } from '../api/endpoints';
import { Cluster, ViolationTypeBreakdown, VehicleTypeBreakdown } from '../types';
import NavBar from '../components/NavBar';
import MapView from '../components/map/MapView';
import ExplainableAIPanel from '../components/panels/ExplainableAIPanel';
import ActionRecommendationCard from '../components/panels/ActionRecommendationCard';

const TIER_COLOR: Record<string, string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00 ${p}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-active)',
      padding: '8px 12px',
      fontFamily: 'DM Sans',
      fontSize: 12,
      color: 'var(--text)',
    }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
        {payload[0].value.toLocaleString()}
      </div>
    </div>
  );
};

export default function ZoneExplorer() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [violTypes, setViolTypes] = useState<ViolationTypeBreakdown[]>([]);
  const [vehTypes, setVehTypes]   = useState<VehicleTypeBreakdown[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [xaiOpen, setXaiOpen] = useState(false);

  useEffect(() => {
    getClusters(undefined, 150).then((data) => {
      const sorted = [...data].sort((a, b) => b.risk_score - a.risk_score);
      setClusters(sorted);
      if (sorted.length > 0) setSelectedId(sorted[0].cluster_id);
    }).catch(() => setClusters([]));
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    setLoadingCharts(true);
    Promise.all([
      getViolationTypes(selectedId).catch(() => [] as ViolationTypeBreakdown[]),
      getVehicleTypes(selectedId).catch(() => [] as VehicleTypeBreakdown[]),
    ]).then(([vt, vet]) => {
      setViolTypes(vt);
      setVehTypes(vet);
    }).finally(() => setLoadingCharts(false));
  }, [selectedId]);

  const selected = useMemo(
    () => clusters.find((c) => c.cluster_id === selectedId) ?? null,
    [clusters, selectedId]
  );

  const rank = useMemo(() => {
    if (!selected) return null;
    return clusters.findIndex((c) => c.cluster_id === selected.cluster_id) + 1;
  }, [clusters, selected]);

  const violChartData = violTypes.slice(0, 8).map((v) => ({
    name: v.violation_type
      .replace('PARKING', 'PKG')
      .replace('WITHOUT', 'W/O')
      .replace('AGAINST', 'AGN')
      .slice(0, 26),
    count: v.count,
  }));

  const vehChartData = vehTypes.slice(0, 8).map((v) => ({
    name: v.vehicle_type,
    count: v.count,
    pct: v.pct,
  }));

  // Color bars by rank: top 2 = tier1, next 3 = tier2, rest = blue
  const violBarColor = (idx: number) => {
    if (idx === 0) return '#FF3B3B';
    if (idx === 1) return '#FF6B3B';
    if (idx < 4)  return '#FF9500';
    return 'var(--blue)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <NavBar />

      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Zone Selector */}
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
            SELECT ZONE
          </div>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
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
            {clusters.map((c, i) => (
              <option key={c.cluster_id} value={c.cluster_id}>
                #{i + 1} — {c.zone_name} ({c.tier})
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'CIS SCORE', value: selected.avg_cis.toFixed(2), color: 'var(--purple)', size: 24 },
                { label: 'VIOLATIONS', value: selected.violation_count.toLocaleString(), color: 'var(--cyan)', size: 22 },
                { label: 'CITY RANK', value: `#${rank}`, color: 'var(--cyan)', size: 22 },
                { label: 'PEAK HOUR', value: fmtHour(selected.peak_hour), color: 'var(--cyan)', size: 16 },
                { label: 'TOP VEHICLE', value: selected.top_vehicle, color: 'var(--text)', size: 13 },
              ].map((k) => (
                <div key={k.label} style={{
                  background: 'var(--bg-surface)',
                  borderLeft: `3px solid ${k.color === 'var(--purple)' ? 'var(--purple)' : k.color === 'var(--text)' ? 'var(--border)' : 'var(--cyan)'}`,
                  padding: '14px 16px',
                }}>
                  <div style={{
                    fontSize: 9,
                    fontFamily: 'DM Sans',
                    color: 'var(--text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}>
                    {k.label}
                  </div>
                  <div style={{
                    fontFamily: k.color === 'var(--text)' ? 'DM Sans' : 'IBM Plex Mono',
                    fontSize: k.size,
                    fontWeight: 500,
                    color: k.color,
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Recommendation + Risk Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ActionRecommendationCard
                cluster={selected}
                onViewReasoning={() => setXaiOpen(true)}
              />
              <div style={{
                background: 'var(--bg-surface)',
                borderLeft: '3px solid var(--cyan)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                  Risk Analysis
                </div>
                {(() => {
                  const persistence = Math.round(Math.min(selected.violation_count / 150 + selected.avg_cis * 3, 45));
                  const confidence  = Math.min(Math.round(selected.avg_cis * 15 + selected.risk_score * 0.4), 99);
                  const peakH       = selected.peak_hour;
                  const peakFmt     = `${peakH % 12 === 0 ? 12 : peakH % 12}:00 ${peakH < 12 ? 'AM' : 'PM'}`;
                  const peakEnd     = `${(peakH + 2) % 12 === 0 ? 12 : (peakH + 2) % 12}:00 ${(peakH + 2) < 12 ? 'AM' : 'PM'}`;
                  const zoneCategory =
                    selected.tier === 'Tier 1' ? 'Critical — Immediate Enforcement' :
                    selected.tier === 'Tier 2' ? 'High — Priority Scheduling'     :
                                                  'Moderate — Routine Patrol';
                  const rows = [
                    { label: 'Total Violations',    value: selected.violation_count.toLocaleString(), color: 'var(--cyan)' },
                    { label: 'Peak Window',          value: `${peakFmt} – ${peakEnd}`,                color: 'var(--tier2)' },
                    { label: 'Persistence',          value: `${persistence} days`,                    color: 'var(--text)' },
                    { label: 'Dominant Violation',   value: selected.top_violation?.slice(0, 22) ?? '—', color: 'var(--text)' },
                    { label: 'Dominant Vehicle',     value: selected.top_vehicle,                     color: 'var(--text)' },
                    { label: 'Confidence Score',     value: `${confidence}%`,                         color: 'var(--purple)' },
                    { label: 'Zone Category',        value: zoneCategory,                             color: selected.tier === 'Tier 1' ? 'var(--tier1)' : selected.tier === 'Tier 2' ? 'var(--tier2)' : 'var(--tier3)' },
                  ];
                  return rows.map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color, textAlign: 'right', lineHeight: 1.3 }}>{value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Charts row */}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Violation type chart */}
              <div style={{
                background: 'var(--bg-surface)',
                borderLeft: '3px solid var(--tier1)',
                padding: '16px 20px',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>
                    VIOLATION TYPE BREAKDOWN
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 2 }}>
                    Top types by frequency — severity order applied
                  </div>
                </div>
                <div style={{ height: 260, marginTop: 16 }}>
                  {loadingCharts ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                      LOADING…
                    </div>
                  ) : violChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={violChartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke="var(--border)" />
                        <XAxis
                          type="number"
                          dataKey="count"
                          tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: 'var(--text-dim)' }}
                          stroke="var(--border)"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={160}
                          tick={{ fontSize: 9, fontFamily: 'DM Sans', fill: 'var(--text-dim)' }}
                          stroke="none"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={0}>
                          {violChartData.map((_, idx) => (
                            <Cell key={idx} fill={violBarColor(idx)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontFamily: 'DM Sans', fontSize: 12 }}>
                      No violation data for this cluster
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle type chart */}
              <div style={{
                background: 'var(--bg-surface)',
                borderLeft: '3px solid var(--blue)',
                padding: '16px 20px',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>
                    VEHICLE TYPE BREAKDOWN
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 2 }}>
                    Vehicles involved in violations — % of total shown
                  </div>
                </div>
                <div style={{ height: 260, marginTop: 16 }}>
                  {loadingCharts ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                      LOADING…
                    </div>
                  ) : vehChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehChartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke="var(--border)" />
                        <XAxis
                          type="number"
                          dataKey="count"
                          tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: 'var(--text-dim)' }}
                          stroke="var(--border)"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fontSize: 9, fontFamily: 'DM Sans', fill: 'var(--text-dim)' }}
                          stroke="none"
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const entry = vehChartData.find((v) => v.name === label);
                            return (
                              <div style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-active)',
                                padding: '8px 12px',
                                fontFamily: 'DM Sans',
                                fontSize: 12,
                                color: 'var(--text)',
                              }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 4 }}>{label}</div>
                                <div style={{ fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
                                  {(payload[0]?.value ?? 0).toLocaleString()} &nbsp;
                                  <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                                    ({entry?.pct ?? 0}%)
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" fill="var(--blue)" radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontFamily: 'DM Sans', fontSize: 12 }}>
                      No vehicle data for this cluster
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mini-map */}
            <div style={{
              background: 'var(--bg-surface)',
              borderLeft: '3px solid var(--border)',
              padding: '16px 20px',
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>
                  CLUSTER LOCATION
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 2 }}>
                  GPS centroid at ({selected.centroid_lat.toFixed(4)}, {selected.centroid_lng.toFixed(4)})
                </div>
              </div>
              <div style={{
                height: 300,
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}>
                <MapView
                  clusters={clusters}
                  onClusterClick={() => {}}
                  singleClusterId={selected.cluster_id}
                  zoom={15}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            fontFamily: 'DM Sans',
            fontSize: 13,
          }}>
            {clusters.length === 0 ? 'Waiting for cluster data…' : 'Select a zone'}
          </div>
        )}
      </div>

      {/* XAI Panel */}
      <ExplainableAIPanel
        cluster={selected ?? null}
        isOpen={xaiOpen}
        onClose={() => setXaiOpen(false)}
      />
    </div>
  );
}
