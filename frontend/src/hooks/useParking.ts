import { useEffect, useState } from 'react';
import {
  getParkingHotspots,
  getParkingPriorities,
  getParkingHeatmap,
} from '../api/endpoints';
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
      const [hotspots, priorities, heatmap] = await Promise.all([
        getParkingHotspots(25),
        getParkingPriorities(25),
        getParkingHeatmap(),
      ]);
      setParkingHotspots(hotspots);
      setParkingPriorities(priorities);
      setParkingHeatmap(heatmap);
    } catch (err) {
      setError('Unable to load parking data');
      console.error('Parking data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  return { loading, error };
}
