import { Fragment } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from 'react-leaflet';
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

type Props = {
  clusters: Cluster[];
  onClusterClick: (c: Cluster) => void;
  selectedId?: number | null;
  singleClusterId?: number | null;
  deployments?: DeploymentSummary[];
  schedules?: ScheduleSummary[];
  showClusters?: boolean;
  zoom?: number;
};

export default function MapView({ clusters, onClusterClick, selectedId, singleClusterId, deployments = [], schedules = [], showClusters = true, zoom = 12 }: Props) {
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
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#00C8FF',
              boxShadow: '0 0 0 4px rgba(0,200,255,0.18)',
            }} />
            Deployed
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px dashed #FFC800',
              boxSizing: 'border-box',
            }} />
            Scheduled
          </div>
        </div>
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#06080F', filter: 'brightness(0.92) contrast(1.3) saturate(1.2)' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        {showClusters && display.map((cluster) => {
          const isSelected = selectedId === cluster.cluster_id;
          const color = TIER_COLOR[cluster.tier];
          const radius = Math.round(getRadius(cluster.violation_count));
          const markerRadius = isSelected ? radius + 3 : radius;
          const deployment = deployments.find((d) => d.cluster_id === cluster.cluster_id);
          const schedule = schedules.find((s) => s.cluster_id === cluster.cluster_id);
          const deployBadgeIcon = deployment ? L.divIcon({
            className: 'deployed-cluster-badge',
            html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:20px;border-radius:999px;background:rgba(0,200,255,0.96);color:#06080F;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;box-shadow:0 4px 10px rgba(0,200,255,0.18);">${deployment.num_officers}</div>`,
            iconSize: [28, 20],
            iconAnchor: [14, -markerRadius - 14],
          }) : null;

          const scheduleBadgeIcon = schedule && !deployment ? L.divIcon({
            className: 'scheduled-cluster-badge',
            html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:20px;border-radius:999px;background:rgba(255,200,0,0.92);color:#06080F;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;box-shadow:0 4px 10px rgba(255,200,0,0.18);">⏰${schedule.num_officers}</div>`,
            iconSize: [36, 20],
            iconAnchor: [18, -markerRadius - 14],
          }) : null;

          return (
            <Fragment key={cluster.cluster_id}>
              {deployment && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 9}
                  pathOptions={{
                    color: '#00C8FF',
                    weight: 2,
                    opacity: 0.85,
                    fillOpacity: 0,
                  }}
                  className="deployed-cluster-ring"
                  interactive={false}
                />
              )}
              {schedule && !deployment && (
                <CircleMarker
                  center={[cluster.centroid_lat, cluster.centroid_lng]}
                  radius={markerRadius + 9}
                  pathOptions={{
                    color: '#FFC800',
                    weight: 2,
                    opacity: 0.85,
                    fillOpacity: 0,
                    dashArray: '6 4',
                  }}
                  className="scheduled-cluster-ring"
                  interactive={false}
                />
              )}
              <CircleMarker
                center={[cluster.centroid_lat, cluster.centroid_lng]}
                radius={markerRadius}
                pathOptions={{
                  color: isSelected ? '#ffffff' : color,
                  fillColor: color,
                  fillOpacity: cluster.tier === 'Tier 1' ? 0.55 : 0.38,
                  weight: isSelected ? 2.5 : 1.5,
                }}
                eventHandlers={{
                  click: () => onClusterClick(cluster),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -markerRadius - 4]}
                  opacity={1}
                >
                  <div style={{
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontFamily: 'DM Sans',
                    fontSize: 12,
                    minWidth: 180,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                        {cluster.zone_name}
                      </div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 700, color }}>
                        {cluster.risk_score.toFixed(0)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-dim)' }}>
                      <div><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Violations</span>: {cluster.violation_count.toLocaleString()}</div>
                      <div><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Peak</span>: {fmtHour(cluster.peak_hour)}</div>
                      <div><span style={{ color }}>●</span> {cluster.tier}</div>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
              {deployBadgeIcon && (
                <Marker
                  position={[cluster.centroid_lat, cluster.centroid_lng]}
                  icon={deployBadgeIcon}
                  interactive={false}
                />
              )}
              {scheduleBadgeIcon && (
                <Marker
                  position={[cluster.centroid_lat, cluster.centroid_lng]}
                  icon={scheduleBadgeIcon}
                  interactive={false}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
