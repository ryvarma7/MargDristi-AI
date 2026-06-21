import { useEffect, useState } from 'react';
import { Cluster } from '../types';
import { useAppStore } from '../store/appStore';

export default function useClusters() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setClusters = useAppStore((state) => state.setClusters);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/data/clusters.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const clusters: Cluster[] = await response.json();
      setClusters(clusters);
    } catch (err) {
      setError('Unable to load cluster data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { loading, error };
}
