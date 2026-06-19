import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { Cluster } from '../../types';

const center: LatLngExpression = [12.9716, 77.5946];

const tierColor: Record<Cluster['tier'], string> = {
  'Tier 1': 'var(--tier1)',
  'Tier 2': 'var(--tier2)',
  'Tier 3': 'var(--tier3)',
};

function getRadius(violationCount: number): number {
  return Math.min(30, Math.max(8, Math.log1p(violationCount) * 3));
}

type Props = {
  clusters: Cluster[];
  onClusterClick: (cluster: Cluster) => void;
};

export default function MapView({ clusters, onClusterClick }: Props) {
  return (
    <MapContainer center={center} zoom={12} className="h-full w-full">
      <TileLayer
        attribution="© CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {clusters.map((cluster) => (
        <CircleMarker
          key={cluster.cluster_id}
          center={[cluster.centroid_lat, cluster.centroid_lng]}
          pathOptions={{
            color: tierColor[cluster.tier],
            fillColor: tierColor[cluster.tier],
            fillOpacity: 0.55,
          }}
          radius={getRadius(cluster.violation_count)}
          eventHandlers={{
            click: () => onClusterClick(cluster),
          }}
        >
          <Popup>
            <div className="max-w-xs">
              <div className="font-semibold text-sm">{cluster.zone_name}</div>
              <div className="text-[var(--text-dim)] text-xs">Risk: {cluster.risk_score}</div>
              <div className="text-[var(--text-dim)] text-xs">Tier: {cluster.tier}</div>
              <div className="text-[var(--text-dim)] text-xs">Peak: {cluster.peak_hour}:00</div>
              <button
                type="button"
                className="mt-2 px-3 py-1 bg-[var(--blue)] text-white text-xs"
                style={{ borderRadius: 0 }}
                onClick={() => onClusterClick(cluster)}
              >
                View in Simulator
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
