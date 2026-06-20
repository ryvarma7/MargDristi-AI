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
  const clusters        = useAppStore((s) => s.clusters);
  const selectedCluster = useAppStore((s) => s.selectedCluster);
  const selectCluster   = useAppStore((s) => s.selectCluster);

  // Full viewport height split:
  // 48px nav + 76px kpi + fill + 36px alert
  const mainH = 'calc(100vh - 48px - 76px - 36px)';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <NavBar />
      <KPIStrip clusters={clusters} />

      {/* Loading / Error states */}
      {loading && clusters.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: 'var(--text-dim)',
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--cyan)',
            animation: 'tier1-pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: '0.1em' }}>
            LOADING INTELLIGENCE DATA…
          </div>
        </div>
      ) : error && clusters.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--tier1)',
            letterSpacing: '0.1em',
          }}>
            NO DATA
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)' }}>
            Start the backend server at <span style={{ color: 'var(--cyan)', fontFamily: 'IBM Plex Mono' }}>localhost:8000</span>
          </div>
          <div style={{
            marginTop: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            padding: '8px 16px',
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--text-dim)',
          }}>
            cd backend &nbsp;&&nbsp; uvicorn main:app --reload --port 8000
          </div>
        </div>
      ) : (
        /* Main content area */
        <div style={{
          height: mainH,
          display: 'grid',
          gridTemplateColumns: '65% 35%',
          overflow: 'hidden',
          flex: 1,
        }}>
          {/* Left: Map */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <MapView
              clusters={clusters}
              onClusterClick={selectCluster}
              selectedId={selectedCluster?.cluster_id ?? null}
            />
          </div>

          {/* Right: Priority + Simulator */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{ flex: '0 0 55%', overflow: 'hidden' }}>
              <PriorityPanel
                clusters={clusters}
                selectedId={selectedCluster?.cluster_id ?? null}
                onSelect={selectCluster}
              />
            </div>
            <div style={{ flex: '0 0 45%', overflow: 'hidden' }}>
              <SimulatorPanel cluster={selectedCluster} />
            </div>
          </div>
        </div>
      )}

      <AlertStrip clusters={clusters} />
    </div>
  );
}
