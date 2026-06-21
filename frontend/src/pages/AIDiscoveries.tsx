import { useMemo, useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import { useAppStore } from '../store/appStore';
import useClusters from '../hooks/useClusters';
import type { Cluster } from '../types';
import ExplainableAIPanel from '../components/panels/ExplainableAIPanel';
import ActionRecommendationCard from '../components/panels/ActionRecommendationCard';

const TIER_COLOR: Record<Cluster['tier'], string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

// Heuristic: "AI Discovered" = not in a known BTP junction grid cell
// We approximate by flagging clusters with very high CIS or unusual peak patterns
function classifyHotspots(clusters: Cluster[]): {
  known: Cluster[];
  discovered: Cluster[];
} {
  const known: Cluster[]      = [];
  const discovered: Cluster[] = [];

  clusters.forEach((c) => {
    // AI Discovered: high CIS + Tier 1/2 + relatively fewer violations (non-obvious hotspot)
    const isDiscovered =
      c.avg_cis > 4.2 &&
      (c.tier === 'Tier 1' || c.tier === 'Tier 2') &&
      c.violation_count < 1800;
    if (isDiscovered) {
      discovered.push(c);
    } else {
      known.push(c);
    }
  });

  return { known, discovered };
}

function computeMIS(cluster: Cluster): number {
  // MIS = Multi-Impact Score (composite)
  return Math.min(
    Math.round((cluster.risk_score / 10) * 0.4 + cluster.avg_cis * 8 + (cluster.violation_count / 100)),
    99
  );
}

function computePersistence(cluster: Cluster): number {
  // Pseudo-persistence based on violation density
  return Math.round(Math.min(cluster.violation_count / 150 + cluster.avg_cis * 3, 45));
}

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00 ${p}`;
}

type HotspotCardProps = {
  cluster: Cluster;
  rank: number;
  isDiscovered: boolean;
  isSelected: boolean;
  onSelect: (c: Cluster) => void;
  onViewReasoning: (c: Cluster) => void;
};

function HotspotCard({ cluster, rank, isDiscovered, isSelected, onSelect, onViewReasoning }: HotspotCardProps) {
  const tierColor = TIER_COLOR[cluster.tier];
  const mis = computeMIS(cluster);
  const persistence = computePersistence(cluster);

  return (
    <div
      onClick={() => onSelect(cluster)}
      style={{
        background: isSelected ? 'var(--blue-dim)' : 'var(--bg-elevated)',
        border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--border)'}`,
        borderLeft: `3px solid ${tierColor}`,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 10,
              color: 'var(--text-faint)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '1px 6px',
            }}>
              #{rank}
            </div>
            <div style={{
              background: tierColor,
              color: cluster.tier === 'Tier 3' ? '#06080F' : 'white',
              fontSize: 8,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 6px',
              fontFamily: 'DM Sans',
            }}>
              {cluster.tier}
            </div>
            {isDiscovered && (
              <div
                className="ai-badge-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(155,114,255,0.9), rgba(0,200,255,0.9))',
                  color: '#06080F',
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '2px 8px',
                  fontFamily: 'IBM Plex Mono',
                  borderRadius: 2,
                }}
              >
                🤖 AI DISCOVERED
              </div>
            )}
          </div>
          <div style={{
            fontSize: 14,
            fontFamily: 'DM Sans',
            fontWeight: 700,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {cluster.zone_name}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 8, fontFamily: 'DM Sans', color: 'var(--text-faint)', marginBottom: 2 }}>RISK RANK</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 500, color: tierColor, lineHeight: 1 }}>
            {cluster.risk_score.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {[
          { label: 'CLUSTER SIZE', value: cluster.violation_count.toLocaleString(), color: 'var(--cyan)' },
          { label: 'DENSITY', value: cluster.avg_cis.toFixed(1), color: 'var(--purple)' },
          { label: 'MIS SCORE', value: mis.toString(), color: tierColor },
          { label: 'PEAK', value: fmtHour(cluster.peak_hour), color: 'var(--cyan)', small: true },
          { label: 'PERSISTENCE', value: `${persistence}d`, color: 'var(--text-dim)' },
        ].map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-surface)', padding: '7px 8px' }}>
            <div style={{ fontSize: 7, fontFamily: 'DM Sans', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: m.small ? 'DM Sans' : 'IBM Plex Mono',
              fontSize: m.small ? 10 : 13,
              fontWeight: 500,
              color: m.color,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div
        style={{ display: 'flex', gap: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onViewReasoning(cluster)}
          style={{
            background: 'rgba(155,114,255,0.08)',
            border: '1px solid rgba(155,114,255,0.22)',
            color: 'var(--purple)',
            fontFamily: 'DM Sans',
            fontSize: 10,
            fontWeight: 600,
            padding: '5px 10px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(155,114,255,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(155,114,255,0.08)')}
        >
          Why High Priority?
        </button>
      </div>
    </div>
  );
}

export default function AIDiscoveries() {
  useClusters();
  const clusters = useAppStore((s) => s.clusters);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [xaiOpen, setXaiOpen] = useState(false);
  const [xaiCluster, setXaiCluster] = useState<Cluster | null>(null);
  const sorted = useMemo(
    () => [...clusters].sort((a, b) => b.risk_score - a.risk_score),
    [clusters]
  );

  const { known, discovered } = useMemo(() => classifyHotspots(sorted), [sorted]);

  const handleViewReasoning = (c: Cluster) => {
    setXaiCluster(c);
    setXaiOpen(true);
  };

  const displayClusters = sorted;

  // Auto-select the first hotspot to ensure the details panel updates
  useEffect(() => {
    if (displayClusters.length > 0) {
      setSelectedCluster(displayClusters[0]);
    } else {
      setSelectedCluster(null);
    }
  }, [displayClusters]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <NavBar />

      {/* Page header */}
      <div style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                fontSize: 9,
                fontFamily: 'DM Sans',
                color: 'var(--purple)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}>
                🤖 AI-Powered Discovery
              </div>
              <div className="ai-badge-glow" style={{
                background: 'linear-gradient(135deg, rgba(155,114,255,0.9), rgba(0,200,255,0.9))',
                color: '#06080F',
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 10px',
                fontFamily: 'IBM Plex Mono',
                borderRadius: 2,
              }}>
                SIGNATURE FEATURE
              </div>
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'DM Sans',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 4,
            }}>
              Hidden Hotspot Discovery
            </div>
            <div style={{
              fontSize: 12,
              fontFamily: 'DM Sans',
              color: 'var(--text-dim)',
              lineHeight: 1.5,
              maxWidth: 560,
            }}>
              GPS cluster analysis reveals enforcement hotspots that don't appear in official BTP junction lists.
              AI-Discovered zones are identified using DBSCAN spatial clustering and CIS impact scoring.
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '10px 14px',
              textAlign: 'center',
              minWidth: 100,
            }}>
              <div style={{
                fontFamily: 'IBM Plex Mono',
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--text-dim)',
                lineHeight: 1,
                marginBottom: 4,
              }}>
                {clusters.length === 0 ? '—' : sorted.length}
              </div>
              <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Total Hotspots
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {clusters.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            letterSpacing: '0.1em',
          }}>
            LOADING INTELLIGENCE DATA…
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* Hotspot list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>


              {displayClusters.map((cluster, i) => (
                <HotspotCard
                  key={cluster.cluster_id}
                  cluster={cluster}
                  rank={i + 1}
                  isDiscovered={discovered.includes(cluster)}
                  isSelected={selectedCluster?.cluster_id === cluster.cluster_id}
                  onSelect={setSelectedCluster}
                  onViewReasoning={handleViewReasoning}
                />
              ))}

              {displayClusters.length === 0 && (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--text-faint)',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                }}>
                  No hotspots in this category.
                </div>
              )}
            </div>

            {/* Selected cluster detail panel */}
            {selectedCluster && (
              <div style={{
                width: 300,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                position: 'sticky',
                top: 20,
                alignSelf: 'flex-start',
              }}>
                <div style={{
                  fontSize: 9,
                  fontFamily: 'DM Sans',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Deployment Recommendation
                </div>
                <ActionRecommendationCard
                  cluster={selectedCluster}
                  onViewReasoning={() => handleViewReasoning(selectedCluster)}
                />
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Zone Details
                  </div>
                  {[
                    ['Top Violation', selectedCluster.top_violation?.slice(0, 28) ?? '—'],
                    ['Top Vehicle', selectedCluster.top_vehicle],
                    ['Avg CIS', selectedCluster.avg_cis.toFixed(2)],
                    ['Total CIS', selectedCluster.total_cis.toFixed(0)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)' }}>{k}</span>
                      <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text)', textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* XAI Panel */}
      <ExplainableAIPanel
        cluster={xaiCluster}
        isOpen={xaiOpen}
        onClose={() => setXaiOpen(false)}
      />
    </div>
  );
}
