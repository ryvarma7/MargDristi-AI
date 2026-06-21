import { useState, useMemo } from 'react';
import NavBar from '../components/NavBar';
import ParkingHotspotMap from '../components/map/ParkingHotspotMap';
import ParkingPrioritiesPanel from '../components/panels/ParkingPrioritiesPanel';
import ParkingHeatmapPanel from '../components/panels/ParkingHeatmapPanel';
import ParkingEffectivenessPanel from '../components/panels/ParkingEffectivenessPanel';
import useParking from '../hooks/useParking';
import { useAppStore } from '../store/appStore';

const TAB_STYLE = (active: boolean) => ({
  padding: '8px 12px',
  background: active ? 'rgba(0, 200, 255, 0.12)' : 'var(--bg-elevated)',
  color: active ? 'var(--cyan)' : 'var(--text-dim)',
  border: `1px solid ${active ? 'rgba(0, 200, 255, 0.22)' : 'var(--border)'}`,
  borderRadius: 6,
  fontSize: 10,
  fontFamily: 'DM Sans',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap' as const,
});

export default function ParkingDashboard() {
  const { loading, error } = useParking();
  const [selectedPriority, setSelectedPriority] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'priorities' | 'heatmap' | 'effectiveness'>('priorities');

  const parkingHotspots   = useAppStore((s) => s.parkingHotspots);
  const parkingPriorities = useAppStore((s) => s.parkingPriorities);
  const parkingHeatmap    = useAppStore((s) => s.parkingHeatmap);

  const kpis = useMemo(() => {
    const total    = parkingHotspots.reduce((s, h) => s + (h.parking_violation_count ?? 0), 0);
    const critical = parkingHotspots.filter((h) => (h.priority_score ?? 0) >= 90).length;
    const avgCong  = parkingHotspots.length
      ? parkingHotspots.reduce((s, h) => s + (h.avg_congestion_impact_pct ?? 0), 0) / parkingHotspots.length
      : 0;
    const top = [...parkingHotspots].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))[0];
    return { total, critical, avgCong, top };
  }, [parkingHotspots]);

  const KPI_CELLS = [
    { label: 'CRITICAL ZONES',   value: kpis.critical.toString(),              color: '#FF3B3B',        sub: 'priority score ≥ 90',  small: false },
    { label: 'TOP HOTSPOT',      value: (kpis.top?.zone_name ?? '—').slice(0, 18), color: 'var(--cyan)', sub: kpis.top ? `Score ${kpis.top.priority_score?.toFixed(0)}` : '—', small: true },
    { label: 'TOTAL ZONES',      value: parkingHotspots.length.toString(),     color: 'var(--cyan)',     sub: 'monitored areas',      small: false },
    { label: 'AVG CONGESTION',   value: `${kpis.avgCong.toFixed(1)}%`,         color: 'var(--purple)',   sub: 'congestion impact',    small: false },
    { label: 'TOTAL VIOLATIONS', value: kpis.total.toString(),                  color: 'var(--cyan)',     sub: 'in dataset',           small: false },
  ];

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <NavBar />

      {/* Parking KPI strip */}
      <div style={{
        height: 76,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
      }}>
        {KPI_CELLS.map((k, i, arr) => (
          <div key={k.label} style={{
            flex: 1,
            borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: k.small ? 13 : 20, fontWeight: 500, color: k.color, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {parkingHotspots.length === 0 ? '—' : k.value}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'DM Sans', marginTop: 2 }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      {loading && parkingHotspots.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-dim)' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--cyan)', animation: 'tier1-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: '0.1em' }}>
            LOADING PARKING INTELLIGENCE…
          </div>
        </div>
      ) : error && parkingHotspots.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--tier1)', letterSpacing: '0.1em' }}>
            DATA UNAVAILABLE
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)' }}>
            Parking intelligence data could not be loaded.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '65% 35%', overflow: 'hidden' }}>
          {/* Left: Map */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <ParkingHotspotMap
              hotspots={parkingHotspots}
              onHotspotClick={(hs) => {
                const priority = parkingPriorities.find((p) => p.cluster_id === hs.cluster_id);
                if (priority) setSelectedPriority(priority);
              }}
              selectedId={selectedPriority?.cluster_id}
            />
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, background: 'var(--bg-surface)', overflowX: 'auto', flexShrink: 0 }}>
              <button type="button" onClick={() => setViewMode('priorities')} style={TAB_STYLE(viewMode === 'priorities')}>Priorities</button>
              <button type="button" onClick={() => setViewMode('heatmap')} style={TAB_STYLE(viewMode === 'heatmap')}>Temporal</button>
              <button type="button" onClick={() => setViewMode('effectiveness')} style={TAB_STYLE(viewMode === 'effectiveness')}>Effectiveness</button>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {viewMode === 'priorities' ? (
                <ParkingPrioritiesPanel
                  priorities={parkingPriorities}
                  onSelect={setSelectedPriority}
                  selectedId={selectedPriority?.cluster_id}
                />
              ) : viewMode === 'heatmap' ? (
                <ParkingHeatmapPanel matrix={parkingHeatmap?.matrix ?? {}} />
              ) : (
                <ParkingEffectivenessPanel />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
