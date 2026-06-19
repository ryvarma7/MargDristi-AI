import { Route, Routes } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';
import ZoneExplorer from './pages/ZoneExplorer';
import TemporalAnalysis from './pages/TemporalAnalysis';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CommandCenter />} />
      <Route path="/zones" element={<ZoneExplorer />} />
      <Route path="/temporal" element={<TemporalAnalysis />} />
    </Routes>
  );
}
