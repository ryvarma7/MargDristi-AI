import { useState } from 'react';
import NavBar from '../components/NavBar';
import KPIStrip from '../components/KPIStrip';
import AlertStrip from '../components/AlertStrip';
import MapView from '../components/map/MapView';
import PriorityPanel from '../components/panels/PriorityPanel';
import SimulatorPanel from '../components/panels/SimulatorPanel';
import useClusters from '../hooks/useClusters';
import { useAppStore } from '../store/appStore';
import type { Cluster } from '../types';

type Tier = Cluster['tier'];
const ALL_TIERS: Tier[] = ['Tier 1', 'Tier 2', 'Tier 3'];
const TIER_COLOR: Record<Tier, string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

export default function CommandCenter() {
  const { loading, error } = useClusters();
  const [showPriorities, setShowPriorities] = useState(false);
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set(ALL_TIERS));

  const toggleTier = (tier: Tier) =>
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        // keep at least one tier active
        if (next.size === 1) return prev;
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  const clusters        = useAppStore((s) => s.clusters);
  const selectedCluster = useAppStore((s) => s.selectedCluster);
  const selectCluster   = useAppStore((s) => s.selectCluster);
  const deployments     = useAppStore((s) => s.deployments);
  const schedules       = useAppStore((s) => s.schedules);
  const showClusters    = useAppStore((s) => s.showClusters);
  const toggleShowClusters = useAppStore((s) => s.toggleShowClusters);

  const filteredClusters = clusters.filter((c) => activeTiers.has(c.tier));

  // Full viewport height split:
  // 48px nav + 76px kpi + fill + 36px alert
  const mainH = 'calc(100vh - 48px - 76px - 36px)';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <NavBar />
      <KPIStrip clusters={clusters} />

      {/* Loading / Error states */}
      {loading && clusters.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: 'var(--text-dim)',
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--cyan)',
            animation: 'tier1-pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: '0.1em' }}>
            LOADING INTELLIGENCE DATA…
          </div>
        </div>
      ) : error && clusters.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--tier1)',
            letterSpacing: '0.1em',
          }}>
            NO DATA
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)' }}>
            Start the backend server at <span style={{ color: 'var(--cyan)', fontFamily: 'IBM Plex Mono' }}>localhost:8000</span>
          </div>
          <div style={{
            marginTop: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            padding: '8px 16px',
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--text-dim)',
          }}>
            cd backend &nbsp;&&nbsp; uvicorn main:app --reload --port 8000
          </div>
        </div>
      ) : (
        /* Main content area */
        <div style={{
          height: mainH,
          display: 'grid',
          gridTemplateColumns: '65% 35%',
          overflow: 'hidden',
          flex: 1,
        }}>
          {/* Left: Map */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              {/* Tier filter chips */}
              {ALL_TIERS.map((tier) => {
                const active = activeTiers.has(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: `1px solid ${active ? TIER_COLOR[tier] : 'rgba(255,255,255,0.12)'}`,
                      background: active ? `${TIER_COLOR[tier]}22` : 'rgba(12,18,33,0.88)',
                      color: active ? TIER_COLOR[tier] : 'var(--text-faint)',
                      fontFamily: 'DM Sans',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: active ? TIER_COLOR[tier] : 'rgba(255,255,255,0.2)',
                      transition: 'background 0.15s',
                    }} />
                    {tier}
                  </button>
                );
              })}
              {/* Show clusters toggle */}
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(12,18,33,0.88)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text)',
                fontFamily: 'DM Sans',
                fontSize: 11,
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
              }}>
                <input
                  type="checkbox"
                  checked={showClusters}
                  onChange={toggleShowClusters}
                  style={{ accentColor: '#00C8FF', width: 12, height: 12 }}
                />
                Show all
              </label>
            </div>
            <MapView
              clusters={filteredClusters}
              onClusterClick={selectCluster}
              selectedId={selectedCluster?.cluster_id ?? null}
              deployments={deployments}
              schedules={schedules}
              showClusters={showClusters}
            />
          </div>

          {/* Right: Simulator + optional priorities */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{
              flex: '0 0 auto',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--bg-surface)',
            }}>
              <div>
                <div style={{
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text)',
                }}>
                  Enforcement Simulation
                </div>
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'var(--text-faint)',
                  marginTop: 4,
                }}>
                  Choose priorities only when needed
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPriorities((prev) => !prev)}
                style={{
                  background: 'rgba(0, 200, 255, 0.12)',
                  color: 'var(--cyan)',
                  border: '1px solid rgba(0, 200, 255, 0.22)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 11,
                  fontFamily: 'IBM Plex Mono',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minWidth: 112,
                }}
              >
                {showPriorities ? 'Hide Priorities' : 'Show Priorities'}
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <SimulatorPanel cluster={selectedCluster} />
            </div>

            {showPriorities && (
              <div style={{
                flex: '0 0 55%',
                minHeight: 260,
                overflow: 'hidden',
                borderTop: '1px solid var(--border)',
              }}>
                <PriorityPanel
                  clusters={clusters}
                  selectedId={selectedCluster?.cluster_id ?? null}
                  onSelect={selectCluster}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <AlertStrip clusters={clusters} />
    </div>
  );
}
