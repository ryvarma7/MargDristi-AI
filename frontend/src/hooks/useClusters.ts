import { useEffect, useState } from 'react';
import { getClusters, getHealth } from '../api/endpoints';
import { Cluster, HealthStatus } from '../types';
import { useAppStore } from '../store/appStore';

export default function useClusters() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setClusters = useAppStore((state) => state.setClusters);
  const setHealth = useAppStore((state) => state.setHealth);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [clusters, health] = await Promise.all([getClusters(undefined, 100), getHealth()]);
      setClusters(clusters);
      setHealth(health);
    } catch (err) {
      setError('Unable to load cluster data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return { loading, error };
}
