import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

export default function useParking() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setParkingHotspots = useAppStore((state) => state.setParkingHotspots);
  const setParkingPriorities = useAppStore((state) => state.setParkingPriorities);
  const setParkingHeatmap = useAppStore((state) => state.setParkingHeatmap);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [hotspotsRes, heatmapRes] = await Promise.all([
        fetch('/data/parking_hotspots.json'),
        fetch('/data/parking_temporal_heatmap.json'),
      ]);

      if (!hotspotsRes.ok || !heatmapRes.ok) {
        throw new Error('Failed to fetch parking data');
      }

      const hotspots = await hotspotsRes.json();
      const heatmapArray = await heatmapRes.json();

      setParkingHotspots(hotspots);
      
      const mappedPriorities = hotspots.map((p: any, idx: number) => ({
        cluster_id: p.cluster_id,
        zone_name: p.zone_name,
        priority_rank: idx + 1,
        priority_score: p.priority_score,
        violation_count: p.parking_violation_count,
        congestion_impact: p.avg_congestion_impact_pct,
        peak_hours: p.peak_hours,
        location_context: p.location_context,
        recommended_officers: Math.max(1, Math.round(p.parking_violation_count / 1500)),
        enforcement_gap_hours: p.enforcement_gap,
      }));
      setParkingPriorities(mappedPriorities);

      const dayMap: Record<string, string> = {
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Saturday': 'Sat',
        'Sunday': 'Sun'
      };

      const matrix: Record<string, Record<number, number>> = {};
      for (const row of heatmapArray) {
        const shortDay = dayMap[row.day] || row.day.slice(0, 3);
        matrix[shortDay] = {};
        for (let h = 0; h < 24; h++) {
          matrix[shortDay][h] = Number(row[`hour_${h}`]) || 0;
        }
      }

      setParkingHeatmap({ matrix });
    } catch (err) {
      setError('Unable to load parking data');
      console.error('Parking data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { loading, error };
}
