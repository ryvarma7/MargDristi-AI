import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
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

function fmtHour(h: number) {
  const p = h < 12 ? 'AM' : 'PM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:00 ${p}`;
}

function getRadius(count: number) {
  return Math.min(30, Math.max(8, Math.log1p(count) * 2.8));
}

type Props = {
  clusters: Cluster[];
  onClusterClick: (c: Cluster) => void;
  selectedId?: number | null;
  singleClusterId?: number | null;
  zoom?: number;
};

export default function MapView({ clusters, onClusterClick, selectedId, singleClusterId, zoom = 12 }: Props) {
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
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', background: '#06080F' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />
      {display.map((cluster) => {
        const isSelected = selectedId === cluster.cluster_id;
        const color = TIER_COLOR[cluster.tier];

        return (
          <CircleMarker
            key={cluster.cluster_id}
            center={[cluster.centroid_lat, cluster.centroid_lng]}
            radius={isSelected ? getRadius(cluster.violation_count) + 4 : getRadius(cluster.violation_count)}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: cluster.tier === 'Tier 1' ? 0.75 : 0.55,
              weight: isSelected ? 3 : cluster.tier === 'Tier 1' ? 2 : 1.5,
            }}
            eventHandlers={{
              click: () => onClusterClick(cluster),
            }}
          >
            <Popup>
              <div style={{
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                padding: '12px 14px',
                minWidth: 200,
                fontFamily: 'DM Sans',
              }}>
                {/* Tier badge */}
                <div style={{
                  display: 'inline-block',
                  background: color,
                  color: cluster.tier === 'Tier 3' ? '#06080F' : 'white',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '2px 7px',
                  marginBottom: 8,
                }}>
                  {cluster.tier}
                </div>

                {/* Zone name */}
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}>
                  {cluster.zone_name}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
                  {[
                    { label: 'RISK SCORE', value: cluster.risk_score.toFixed(0), color: 'var(--purple)' },
                    { label: 'PEAK', value: fmtHour(cluster.peak_hour), color: 'var(--cyan)' },
                    { label: 'VIOLATIONS', value: cluster.violation_count.toLocaleString(), color: 'var(--cyan)' },
                    { label: 'CIS AVG', value: cluster.avg_cis.toFixed(2), color: 'var(--purple)' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: s.color, fontWeight: 500 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onClusterClick(cluster)}
                  style={{
                    width: '100%',
                    background: 'var(--blue)',
                    color: 'white',
                    border: 'none',
                    padding: '7px 0',
                    fontSize: 12,
                    fontFamily: 'DM Sans',
                    fontWeight: 600,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  SIMULATE ENFORCEMENT →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
