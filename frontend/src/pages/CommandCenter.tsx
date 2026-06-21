import { useState } from 'react';
import NavBar from '../components/NavBar';
import KPIStrip from '../components/KPIStrip';
import MapView from '../components/map/MapView';
import PriorityPanel from '../components/panels/PriorityPanel';
import ExplainableAIPanel from '../components/panels/ExplainableAIPanel';
import OfficerOpsAlerts from '../components/panels/OfficerOpsAlerts';
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

// Inline SVG icons
const IconChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconChevronUp = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const IconUsers = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconAlertCircle = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function CommandCenter() {
  const { loading, error } = useClusters();
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set(ALL_TIERS));
  const [xaiOpen, setXaiOpen] = useState(false);
  const [xaiCluster, setXaiCluster] = useState<Cluster | null>(null);
  const [showOpsAlerts, setShowOpsAlerts] = useState(false); // collapsed by default

  const toggleTier = (tier: Tier) =>
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
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

  const handleViewReasoning = (c: Cluster) => {
    setXaiCluster(c);
    setXaiOpen(true);
  };

  const handleScheduleFromQueue = (c: Cluster) => {
    selectCluster(c);
  };

  // Height: viewport minus NavBar (48px) minus KPIStrip (76px)
  const mainH = 'calc(100vh - 48px - 76px)';

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
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--cyan)',
            animation: 'tier1-pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: '0.1em' }}>
            LOADING OPERATIONAL DATA…
          </div>
        </div>
      ) : error && clusters.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--tier1)', letterSpacing: '0.1em' }}>
            BACKEND UNAVAILABLE
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)' }}>
            Backend service unavailable.
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
            cd backend &nbsp;&& uvicorn main:app --reload --port 8000
          </div>
        </div>
      ) : (
        <div style={{
          height: mainH,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
        }}>
          {/* Main content: map (70%) + right panel (30%) */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '70% 30%',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {/* Left: Full-height Map */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Tier filter chips — overlaid on map */}
              <div style={{
                position: 'absolute',
                bottom: 16,
                left: 200,
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}>
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
                        width: 7, height: 7, borderRadius: '50%',
                        background: active ? TIER_COLOR[tier] : 'rgba(255,255,255,0.2)',
                        transition: 'background 0.15s',
                      }} />
                      {tier}
                    </button>
                  );
                })}
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

            {/* Right: Priority Action Queue (full height) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              {/* Right panel header */}
              <div style={{
                flex: '0 0 auto',
                padding: '10px 18px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    Priority Action Queue
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
                    Ranked enforcement recommendations
                  </div>
                </div>
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'var(--cyan)',
                  background: 'rgba(0,200,255,0.08)',
                  border: '1px solid rgba(0,200,255,0.18)',
                  padding: '3px 8px',
                }}>
                  LIVE
                </div>
              </div>

              {/* Priority Queue — fills remaining right panel height */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <PriorityPanel
                  clusters={clusters}
                  selectedId={selectedCluster?.cluster_id ?? null}
                  onSelect={selectCluster}
                  onViewReasoning={handleViewReasoning}
                  onSchedule={handleScheduleFromQueue}
                />
              </div>
            </div>
          </div>

          {/* Bottom: Officer Operations — collapsible */}
          {clusters.length > 0 && (
            <div style={{
              flexShrink: 0,
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <button
                onClick={() => setShowOpsAlerts((v) => !v)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderBottom: showOpsAlerts ? '1px solid var(--border)' : 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  padding: '7px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{
                  fontSize: 9,
                  fontFamily: 'DM Sans',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <IconUsers />
                  OFFICER OPERATIONS STATUS
                  {deployments.length > 0 && (
                    <span style={{
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 9,
                      background: 'rgba(0,200,255,0.1)',
                      border: '1px solid rgba(0,200,255,0.2)',
                      color: 'var(--cyan)',
                      padding: '1px 6px',
                      borderRadius: 2,
                    }}>
                      {deployments.length} active
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center' }}>
                  {showOpsAlerts ? <IconChevronUp /> : <IconChevronDown />}
                </div>
              </button>

              {showOpsAlerts && (
                <div style={{ padding: '8px 16px 12px' }}>
                  <OfficerOpsAlerts
                    clusters={clusters}
                    deployments={deployments}
                    schedules={schedules}
                    onSelect={(clusterId) => {
                      const c = clusters.find((cl) => cl.cluster_id === clusterId);
                      if (c) selectCluster(c);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* XAI Panel — modal drawer */}
      <ExplainableAIPanel
        cluster={xaiCluster}
        isOpen={xaiOpen}
        onClose={() => setXaiOpen(false)}
      />
    </div>
  );
}
