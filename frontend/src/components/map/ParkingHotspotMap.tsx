import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const BENGALURU_ZOOM = 11;

function ResetToBengaluruControl() {
  const map = useMap();
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        right: 12,
        zIndex: 1000,
      }}
    >
      <button
        onClick={() => map.setView(BENGALURU_CENTER, BENGALURU_ZOOM)}
        style={{
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
    </div>
  );
}

interface ParkingHotspot {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  parking_violation_count: number;
  avg_congestion_impact_pct: number;
  location_context: string;
  peak_hours: string;
  priority_score: number;
}

interface Props {
  hotspots: ParkingHotspot[];
  onHotspotClick?: (hotspot: ParkingHotspot) => void;
  selectedId?: number | null;
}

function ParkingLegend() {
  return (
    <div style={{
      position: 'absolute',
      top: 80,
      right: 16,
      zIndex: 1000,
      background: 'rgba(12, 18, 33, 0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: 12,
      fontFamily: 'DM Sans',
      fontSize: 11,
      color: 'var(--text-dim)',
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
        Parking Severity
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#FF3B3B',
        }} />
        <span>Critical (90+)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#FF9500',
        }} />
        <span>High (70-89)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#00C853',
        }} />
        <span>Medium (&lt;70)</span>
      </div>
    </div>
  );
}

export default function ParkingHotspotMap({ hotspots, onHotspotClick, selectedId }: Props) {

  const getRadius = (violations: number) => {
    return Math.max(8, Math.min(25, violations / 2));
  };

  const getPriorityColor = (score: number) => {
    if (score >= 90) return '#FF3B3B';
    if (score >= 70) return '#FF9500';
    return '#00C853';
  };

  const createCustomIcon = (zone_name: string) => {
    return L.divIcon({
      html: `<div style="font-family: IBM Plex Mono; font-size: 10px; color: white; font-weight: 700; background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 3px; text-align: center; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${zone_name}</div>`,
      className: 'parking-label-icon',
      iconSize: [60, 24],
      iconAnchor: [30, 12],
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={BENGALURU_CENTER}
        zoom={BENGALURU_ZOOM}
        style={{ width: '100%', height: '100%', filter: 'brightness(1.3) contrast(1.6) saturate(1.1)' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CartoDB</a>'
          maxZoom={19}
        />

        {hotspots.map((hotspot) => {
          const isSelected = selectedId === hotspot.cluster_id;
          const color = getPriorityColor(hotspot.priority_score);
          const radius = getRadius(hotspot.parking_violation_count);

          return (
            <React.Fragment key={hotspot.cluster_id}>
              <CircleMarker
                center={[hotspot.centroid_lat, hotspot.centroid_lng]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  color: isSelected ? '#00C8FF' : color,
                  weight: isSelected ? 3 : 2,
                  opacity: 0.9,
                  fillOpacity: 0.7,
                }}
                eventHandlers={{
                  click: () => onHotspotClick?.(hotspot),
                }}
              >
                <Tooltip>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{hotspot.zone_name}</div>
                    <div>Violations: {hotspot.parking_violation_count}</div>
                    <div>Congestion Impact: {hotspot.avg_congestion_impact_pct.toFixed(1)}%</div>
                    <div>Priority Score: {hotspot.priority_score.toFixed(0)}</div>
                    <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-dim)' }}>
                      Peak: {hotspot.peak_hours}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>

              <Marker
                position={[hotspot.centroid_lat, hotspot.centroid_lng]}
                icon={createCustomIcon(hotspot.zone_name)}
              >
                <Popup>
                  <div style={{ fontFamily: 'DM Sans', width: 220 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      {hotspot.zone_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                      <div>Violations: <strong>{hotspot.parking_violation_count}</strong></div>
                      <div>Congestion Impact: <strong>{hotspot.avg_congestion_impact_pct.toFixed(1)}%</strong></div>
                      <div>Priority Score: <strong>{hotspot.priority_score.toFixed(0)}</strong></div>
                      <div>Context: <strong>{hotspot.location_context}</strong></div>
                      <div>Peak Hours: <strong>{hotspot.peak_hours}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
        <ResetToBengaluruControl />
      </MapContainer>

      <ParkingLegend />
    </div>
  );
}
