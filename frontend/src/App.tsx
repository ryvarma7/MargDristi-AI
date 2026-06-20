import { Route, Routes } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';
import ZoneExplorer from './pages/ZoneExplorer';
import TemporalAnalysis from './pages/TemporalAnalysis';
import ParkingDashboard from './pages/ParkingDashboard';
import HiddenHotspots from './pages/HiddenHotspots';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CommandCenter />} />
      <Route path="/zones" element={<ZoneExplorer />} />
      <Route path="/temporal" element={<TemporalAnalysis />} />
      <Route path="/parking" element={<ParkingDashboard />} />
      <Route path="/hotspots" element={<HiddenHotspots />} />
      {/* Legacy redirect path */}
      <Route path="/discoveries" element={<HiddenHotspots />} />
    </Routes>
  );
}
