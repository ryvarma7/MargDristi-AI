import { Fragment, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Cluster } from '../../types';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

const TIER_COLOR: Record<Cluster['tier'], string> = {
  'Tier 1': '#FF3B3B',
  'Tier 2': '#FF9500',
  'Tier 3': '#00C853',
};

type DeploymentSummary = {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  num_officers: number;
};

type ScheduleSummary = {
  cluster_id: number;
  num_officers: number;
  scheduled_time: string;
};

// Map layer definitions
type LayerId = 'risk' | 'impact' | 'forecast' | 'hidden' | 'junction';
const LAYERS: { id: LayerId; label: string; color: string }[] = [
  { id: 'risk',     label: 'Risk',             color: '#FF3B3B' },
  { id: 'impact',   label: 'Impact',           color: '#9B72FF' },
  { id: 'forecast', label: 'Forecast',         color: '#FF9500' },
  { id: 'hidden',   label: 'Unmapped Hotspots',color: '#00C8FF' },
  { id: 'junction', label: 'Junctions',        color: '#1E6FFF' },
];

function ResetToBengaluruControl() {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(BENGALURU_CENTER, 11)}
      style={{
        position: 'absolute',
        bottom: 80,
        right: 12,
        zIndex: 2000,
        background: 'rgba(11, 22, 41, 0.94)',
        border: '1px solid rgba(30, 111, 255, 0.35)',
        color: 'var(--cyan)',
        fontFamily: 'IBM Plex Mono',
        fontSize: 9,
        fontWeight: 700,
        padding: '6px 10px',
        cursor: 'pointer',
        letterSpacing: '0.06em',
        borderRadius: 4,
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        whiteSpace: 'nowrap',
      }}
      title="Reset to Bengaluru"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      BENGALURU
    </button>
  );
}

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00 ${p}`;
}

function getRadius(count: number) {
  const minCount = 50;
  const maxCount = 5000;
  if (count <= minCount) return 7;
  if (count >= maxCount) return 22;
  return 7 + ((count - minCount) / (maxCount - minCount)) * 15;
}

// Determine if a cluster is "AI Discovered" (heuristic: high CIS, not in typical junction grid)
function isAIDiscovered(cluster: Cluster): boolean {
  return cluster.avg_cis > 4.5 && cluster.tier === 'Tier 1' && cluster.violation_count > 800;
}

// Upcoming peak within next 3 hours
function isUpcomingPeak(cluster: Cluster): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const hours = (cluster.peak_hour - currentHour + 24) % 24;
  return hours >= 0 && hours <= 3;
}

type Props = {
  clusters: Cluster[];
  onClusterClick: (c: Cluster) => void;
  selectedId?: number | null;
  singleClusterId?: number | null;
  deployments?: DeploymentSummary[];
  schedules?: ScheduleSummary[];
  showClusters?: boolean;
  zoom?: number;
  activeLayers?: Set<LayerId>;
};

export default function MapView({
  clusters,
  onClusterClick,
  selectedId,
  singleClusterId,
  deployments = [],
  schedules = [],
  showClusters = true,
  zoom = 11,
  activeLayers: externalLayers,
}: Props) {
  const [internalLayers, setInternalLayers] = useState<Set<LayerId>>(new Set(['risk', 'impact']));
  const activeLayers = externalLayers ?? internalLayers;

  const toggleLayer = (id: LayerId) => {
    setInternalLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const display = singleClusterId !== undefined
    ? clusters.filter((c) => c.cluster_id === singleClusterId)
    : clusters;

  const centerCluster = singleClusterId !== undefined
    ? clusters.find((c) => c.cluster_id === singleClusterId)
    : null;

  const center: [number, number] = centerCluster
    ? [centerCluster.centroid_lat, centerCluster.centroid_lng]
    : BENGALURU_CENTER;

  return (
    <div style={{ position: 'relative', height: '100%' }}>

      {/* Layer toggles — top left */}
      {externalLayers === undefined && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}>
          <div style={{
            fontSize: 8,
            fontFamily: 'DM Sans',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 2,
            background: 'rgba(12,18,33,0.88)',
            padding: '3px 8px',
            borderRadius: 4,
          }}>
            Map Layers
          </div>
          {LAYERS.map((layer) => {
            const active = activeLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                className="map-layer-btn"
                onClick={() => toggleLayer(layer.id)}
                style={{
                  border: `1px solid ${active ? layer.color : 'rgba(255,255,255,0.12)'}`,
                  background: active ? `${layer.color}22` : 'rgba(12,18,33,0.88)',
                  color: active ? layer.color : 'var(--text-faint)',
                }}
              >
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: active ? layer.color : 'rgba(255,255,255,0.2)',
                }} />
                {layer.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend — top right */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 2000,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(12, 18, 33, 0.88)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text)',
          padding: '8px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontFamily: 'DM Sans',
          boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C8FF', boxShadow: '0 0 0 4px rgba(0,200,255,0.18)' }} />
            Deployed
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px dashed #FFC800', boxSizing: 'border-box' }} />
            Scheduled
          </div>
          {activeLayers.has('hidden') && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, background: 'linear-gradient(135deg, #9B72FF, #00C8FF)', borderRadius: 2 }} />
              Unmapped Hotspot
            </div>
          )}
          {activeLayers.has('forecast') && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #FF9500', boxSizing: 'border-box' }} />
              Peak Soon
            </div>
          )}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#0d1520', filter: 'brightness(1.3) contrast(1.6) saturate(1.1)' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {showClusters && display.map((cluster) => {
          const isSelected  = selectedId === cluster.cluster_id;
          const color       = TIER_COLOR[cluster.tier];
          const baseRadius  = Math.round(getRadius(cluster.violation_count));
          const markerRadius = isSelected ? baseRadius + 3 : baseRadius;
          const deployment  = deployments.find((d) => d.cluster_id === cluster.cluster_id);
          const schedule    = schedules.find((s) => s.cluster_id === cluster.cluster_id);
          const aiDiscovered = isAIDiscovered(cluster);
          const upcomingPeak = isUpcomingPeak(cluster);

          const isDeployed  = !!deployment;
          const isScheduled = !!schedule && !isDeployed;

          let markerColor = color;
          let markerFillColor = color;
          let markerDashArray: string | undefined = undefined;

          if (isDeployed) {
            markerColor = '#00C8FF';
            markerFillColor = '#00C8FF';
          } else if (isScheduled) {
            markerColor = '#FFC800';
            markerDashArray = '5, 5';
          }

          if (isSelected) {
            markerColor = '#ffffff';
          }

          // Impact radius — proportional to CIS score (Impact layer)
          const impactRadius = activeLayers.has('impact')
            ? markerRadius + Math.round(cluster.avg_cis * 1.5)
            : 0;

          const deployBadgeIcon = deployment ? L.divIcon({
            className: 'deployed-cluster-badge',
            html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:20px;border-radius:999px;background:rgba(0,200,255,0.96);color:#06080F;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;box-shadow:0 4px 10px rgba(0,200,255,0.18);">${deployment.num_officers}</div>`,
            iconSize: [28, 20],
            iconAnchor: [14, -markerRadius - 14],
          }) : null;

          const scheduleBadgeIcon = schedule && !deployment ? L.divIcon({
            className: 'scheduled-cluster-badge',
            html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:20px;border-radius:999px;background:rgba(255,200,0,0.92);color:#06080F;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;box-shadow:0 4px 10px rgba(255,200,0,0.18);">+${schedule.num_officers}</div>`,
            iconSize: [36, 20],
            iconAnchor: [18, -markerRadius - 14],
          }) : null;

          const aiDiscoveredBadge = aiDiscovered && activeLayers.has('hidden') ? L.divIcon({
            className: '',
            html: `<div class="ai-badge-glow" style="display:flex;align-items:center;justify-content:center;padding:2px 6px;border-radius:999px;background:linear-gradient(135deg,rgba(155,114,255,0.9),rgba(0,200,255,0.9));color:#06080F;font-family:'DM Sans',sans-serif;font-size:8px;font-weight:700;white-space:nowrap;letter-spacing:0.04em;">AI</div>`,
            iconSize: [26, 14],
            iconAnchor: [13, -markerRadius - 22],
          }) : null;

          return (
            <Fragment key={cluster.cluster_id}>
              {/* Impact Layer — soft aura ring */}
              {activeLayers.has('impact') && impactRadius > 0 && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={impactRadius}
                  pathOptions={{
                    color: '#9B72FF',
                    weight: 1,
                    opacity: 0.2,
                    fillOpacity: 0.04,
                    fillColor: '#9B72FF',
                  }}
                  interactive={false}
                />
              )}

              {/* Forecast Layer — amber ring for upcoming peak */}
              {activeLayers.has('forecast') && upcomingPeak && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 14}
                  pathOptions={{
                    color: '#FF9500',
                    weight: 1.5,
                    opacity: 0.6,
                    fillOpacity: 0,
                    dashArray: '4 3',
                  }}
                  interactive={false}
                />
              )}

              {/* Junction Layer — official junction outline ring */}
              {activeLayers.has('junction') && !aiDiscovered && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 6}
                  pathOptions={{
                    color: '#1E6FFF',
                    weight: 1,
                    opacity: 0.3,
                    fillOpacity: 0,
                  }}
                  interactive={false}
                />
              )}

              {/* AI Discovered Layer — purple ring */}
              {activeLayers.has('hidden') && aiDiscovered && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 10}
                  pathOptions={{
                    color: '#9B72FF',
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.05,
                    fillColor: '#9B72FF',
                  }}
                  interactive={false}
                />
              )}

              {/* Deployment ring */}
              {deployment && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 9}
                  pathOptions={{ color: '#00C8FF', weight: 2, opacity: 0.85, fillOpacity: 0 }}
                  className="deployed-cluster-ring"
                  interactive={false}
                />
              )}

              {/* Schedule ring */}
              {schedule && !deployment && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 9}
                  pathOptions={{ color: '#FFC800', weight: 2, opacity: 0.85, fillOpacity: 0, dashArray: '6 4' }}
                  className="scheduled-cluster-ring"
                  interactive={false}
                />
              )}

              {/* Main marker — Risk layer */}
              {activeLayers.has('risk') && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius}
                  pathOptions={{
                    color: markerColor,
                    fillColor: markerFillColor,
                    fillOpacity: cluster.tier === 'Tier 1' ? 0.55 : 0.38,
                    weight: isSelected ? 2.5 : 1.5,
                    dashArray: markerDashArray,
                  }}
                  eventHandlers={{ click: () => onClusterClick(cluster) }}
                >
                  <Tooltip direction="top" offset={[0, -markerRadius - 4]} opacity={1}>
                    <div style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontFamily: 'DM Sans',
                      fontSize: 12,
                      minWidth: 200,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{cluster.zone_name}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 700, color }}>{cluster.risk_score.toFixed(0)}</div>
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-dim)' }}>
                        <div><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Violations</span>: {cluster.violation_count.toLocaleString()}</div>
                        <div><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Peak</span>: {fmtHour(cluster.peak_hour)}</div>
                        <div><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>CIS</span>: {cluster.avg_cis.toFixed(2)}</div>
                        <div><span style={{ color }}>●</span> {cluster.tier}</div>
                        {aiDiscovered && (
                          <div style={{ marginTop: 4, color: '#9B72FF', fontWeight: 600, fontSize: 10 }}>
                            Unmapped Hotspot
                          </div>
                        )}
                        {upcomingPeak && (
                          <div style={{ color: '#FF9500', fontWeight: 600, fontSize: 10 }}>
                            Peak in &lt;3h
                          </div>
                        )}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )}

              {deployBadgeIcon && (
                <Marker position={[cluster.centroid_lat, cluster.centroid_lng]} icon={deployBadgeIcon} interactive={false} />
              )}
              {scheduleBadgeIcon && (
                <Marker position={[cluster.centroid_lat, cluster.centroid_lng]} icon={scheduleBadgeIcon} interactive={false} />
              )}
              {aiDiscoveredBadge && (
                <Marker position={[cluster.centroid_lat, cluster.centroid_lng]} icon={aiDiscoveredBadge} interactive={false} />
              )}
            </Fragment>
          );
        })}
        <ResetToBengaluruControl />
      </MapContainer>
    </div>
  );
}
