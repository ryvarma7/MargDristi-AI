import { useEffect, useState } from 'react';
import { simulate } from '../api/endpoints';
import { SimulateRequest, SimulateResponse } from '../types';
import { useAppStore } from '../store/appStore';

const debounce = (fn: () => void, wait: number) => {
  let timeout: number | undefined;
  return () => {
    if (timeout) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(fn, wait);
  };
};

export default function useSimulate(request: SimulateRequest | null) {
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSimResult = useAppStore((state) => state.setSimResult);

  useEffect(() => {
    if (!request) {
      setResult(null);
      setSimResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const execute = async () => {
      try {
        const response = await simulate(request);
        setResult(response);
        setSimResult(response);
      } catch (err) {
        setError('Simulation failed');
        setSimResult(null);
      } finally {
        setLoading(false);
      }
    };

    const debounced = debounce(execute, 400);
    debounced();
  }, [request?.cluster_id, request?.num_officers, request?.hour, request?.day_of_week]);

  return { result, loading, error };
}
