import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const linkClass = 'text-[var(--text-dim)] px-3 py-2 text-sm';
const activeClass = 'text-[var(--blue)] border-b-2 border-[var(--blue)]';

export default function NavBar() {
  const health = useAppStore((state) => state.health);
  const statusColor = health?.status === 'healthy' ? 'bg-[#00C853]' : 'bg-[#FF3B3B]';

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center bg-[var(--blue)] text-white text-sm font-bold" style={{ borderRadius: 0 }}>
          M
        </div>
        <span className="font-semibold tracking-[0.15em] text-sm">MARGDRISTI</span>
      </div>
      <div className="flex items-center gap-2">
        <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
          Command Center
        </NavLink>
        <NavLink to="/zones" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
          Zone Explorer
        </NavLink>
        <NavLink to="/temporal" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
          Temporal Analysis
        </NavLink>
      </div>
      <div className="flex items-center gap-2 text-[var(--text-dim)] text-xs mono">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        SYSTEM ONLINE
      </div>
    </div>
  );
}
