import { useMemo } from 'react';
import NavBar from '../components/NavBar';
import KPIStrip from '../components/KPIStrip';
import AlertStrip from '../components/AlertStrip';
import MapView from '../components/map/MapView';
import PriorityPanel from '../components/panels/PriorityPanel';
import SimulatorPanel from '../components/panels/SimulatorPanel';
import useClusters from '../hooks/useClusters';
import { useAppStore } from '../store/appStore';

export default function CommandCenter() {
  const { loading, error } = useClusters();
  const clusters = useAppStore((state) => state.clusters);
  const selectedCluster = useAppStore((state) => state.selectedCluster);
  const selectCluster = useAppStore((state) => state.selectCluster);

  const header = useMemo(() => {
    if (loading) {
      return 'LOADING INTELLIGENCE DATA...';
    }
    if (error) {
      return 'NO DATA — Start the backend server at localhost:8000';
    }
    return null;
  }, [loading, error]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text)]">
      <NavBar />
      {header ? (
        <div className="flex h-[calc(100vh-48px)] items-center justify-center text-lg text-[var(--text-dim)]">
          {header}
        </div>
      ) : (
        <>
          <KPIStrip clusters={clusters} />
          <div className="grid h-[calc(100vh-48px-80px-36px)] grid-cols-[65%_35%] gap-3 p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-2">
              <MapView clusters={clusters} onClusterClick={selectCluster} />
            </div>
            <div className="flex flex-col gap-3">
              <div className="h-[55%]">
                <PriorityPanel
                  clusters={clusters}
                  selectedId={selectedCluster?.cluster_id ?? null}
                  onSelect={selectCluster}
                />
              </div>
              <div className="h-[45%]">
                <SimulatorPanel cluster={selectedCluster} />
              </div>
            </div>
          </div>
          <AlertStrip clusters={clusters} />
        </>
      )}
    </div>
  );
}
