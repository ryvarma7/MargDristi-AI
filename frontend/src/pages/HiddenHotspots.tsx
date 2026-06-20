import { useMemo, useState } from 'react';
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

// Unmapped hotspots = high CIS + Tier 1/2 + fewer violations (not in official BTP junction list)
function classifyHotspots(clusters: Cluster[]): {
  known: Cluster[];
  unmapped: Cluster[];
} {
  const known: Cluster[]   = [];
  const unmapped: Cluster[] = [];

  clusters.forEach((c) => {
    const isUnmapped =
      c.avg_cis > 4.2 &&
      (c.tier === 'Tier 1' || c.tier === 'Tier 2') &&
      c.violation_count < 1800;
    if (isUnmapped) {
      unmapped.push(c);
    } else {
      known.push(c);
    }
  });

  return { known, unmapped };
}

function computeMIS(cluster: Cluster): number {
  return Math.min(
    Math.round((cluster.risk_score / 10) * 0.4 + cluster.avg_cis * 8 + (cluster.violation_count / 100)),
    99
  );
}

function computePersistence(cluster: Cluster): number {
  return Math.round(Math.min(cluster.violation_count / 150 + cluster.avg_cis * 3, 45));
}

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00 ${p}`;
}

// Inline SVG icons
const IconRadar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/>
  </svg>
);

const IconMapPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

type HotspotCardProps = {
  cluster: Cluster;
  rank: number;
  isUnmapped: boolean;
  isSelected: boolean;
  onSelect: (c: Cluster) => void;
  onViewReasoning: (c: Cluster) => void;
};

function HotspotCard({ cluster, rank, isUnmapped, isSelected, onSelect, onViewReasoning }: HotspotCardProps) {
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
            {isUnmapped && (
              <div style={{
                background: 'rgba(0, 200, 255, 0.1)',
                border: '1px solid rgba(0, 200, 255, 0.28)',
                color: 'var(--cyan)',
                fontSize: 8,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                fontFamily: 'IBM Plex Mono',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <IconRadar /> UNMAPPED
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
          <div style={{ fontSize: 8, fontFamily: 'DM Sans', color: 'var(--text-faint)', marginBottom: 2 }}>RISK SCORE</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 500, color: tierColor, lineHeight: 1 }}>
            {cluster.risk_score.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {[
          { label: 'VIOLATIONS', value: cluster.violation_count.toLocaleString(), color: 'var(--cyan)' },
          { label: 'CIS DENSITY', value: cluster.avg_cis.toFixed(1), color: 'var(--purple)' },
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
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(155,114,255,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(155,114,255,0.08)')}
        >
          <IconAlertTriangle /> View Risk Factors
        </button>
      </div>
    </div>
  );
}

export default function HiddenHotspots() {
  useClusters();
  const clusters = useAppStore((s) => s.clusters);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [xaiOpen, setXaiOpen] = useState(false);
  const [xaiCluster, setXaiCluster] = useState<Cluster | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'known' | 'unmapped'>('all');

  const sorted = useMemo(
    () => [...clusters].sort((a, b) => b.risk_score - a.risk_score),
    [clusters]
  );

  const { known, unmapped } = useMemo(() => classifyHotspots(sorted), [sorted]);

  const handleViewReasoning = (c: Cluster) => {
    setXaiCluster(c);
    setXaiOpen(true);
  };

  const displayClusters = activeTab === 'known'
    ? known
    : activeTab === 'unmapped'
      ? unmapped
      : sorted;

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
                fontFamily: 'IBM Plex Mono',
                color: 'var(--cyan)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <IconMapPin /> UNMAPPED ENFORCEMENT ZONES
              </div>
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'DM Sans',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 4,
            }}>
              Coverage Gap Analysis
            </div>
            <div style={{
              fontSize: 12,
              fontFamily: 'DM Sans',
              color: 'var(--text-dim)',
              lineHeight: 1.5,
              maxWidth: 560,
            }}>
              GPS cluster analysis reveals enforcement hotspots outside the official BTP junction registry.
              Unmapped zones are identified through DBSCAN spatial clustering and CIS impact scoring.
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {[
              { label: 'Known Junctions', value: known.length, color: 'var(--cyan)' },
              { label: 'Unmapped Hotspots', value: unmapped.length, color: 'var(--purple)' },
              { label: 'Total Zones', value: sorted.length, color: 'var(--text-dim)' },
            ].map((s) => (
              <div key={s.label} style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                padding: '10px 14px',
                textAlign: 'center',
                minWidth: 90,
              }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 22,
                  fontWeight: 500,
                  color: s.color,
                  lineHeight: 1,
                  marginBottom: 4,
                }}>
                  {clusters.length === 0 ? '—' : s.value}
                </div>
                <div style={{ fontSize: 9, fontFamily: 'DM Sans', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
          {([
            { id: 'all', label: `All Hotspots (${sorted.length})` },
            { id: 'known', label: `Known Junctions (${known.length})` },
            { id: 'unmapped', label: `Unmapped Hotspots (${unmapped.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                border: `1px solid ${activeTab === tab.id ? 'var(--border-active)' : 'var(--border)'}`,
                background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-dim)',
                fontFamily: 'DM Sans',
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
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
            LOADING ENFORCEMENT DATA…
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* Hotspot list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {activeTab === 'unmapped' && (
                <div style={{
                  background: 'rgba(0, 200, 255, 0.04)',
                  border: '1px solid rgba(0, 200, 255, 0.14)',
                  borderLeft: '3px solid var(--cyan)',
                  padding: '10px 14px',
                  fontSize: 11,
                  fontFamily: 'DM Sans',
                  color: 'var(--text-dim)',
                  lineHeight: 1.5,
                }}>
                  These zones were not present in the original BTP enforcement database but were identified through
                  spatial clustering of GPS violation records. They represent{' '}
                  <strong style={{ color: 'var(--cyan)' }}>emerging or overlooked</strong> enforcement gaps.
                </div>
              )}

              {displayClusters.map((cluster, i) => (
                <HotspotCard
                  key={cluster.cluster_id}
                  cluster={cluster}
                  rank={i + 1}
                  isUnmapped={unmapped.includes(cluster)}
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
