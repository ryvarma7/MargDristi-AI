import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export default function NavBar() {
  const health = useAppStore((s) => s.health);
  const isOnline = health?.status === 'healthy';

  return (
    <nav
      style={{
        height: 48,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polygon
            points="14,2 26,9 26,19 14,26 2,19 2,9"
            fill="var(--blue)"
            stroke="var(--border-active)"
            strokeWidth="1"
          />
          <text
            x="14" y="18"
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontFamily="IBM Plex Mono"
            fontWeight="500"
          >M</text>
        </svg>
        <span style={{
          fontFamily: 'DM Sans',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.18em',
          color: 'var(--text)',
        }}>
          MARGDRISTI
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
        {[
          { to: '/', label: 'Command Center' },
          { to: '/zones', label: 'Zone Explorer' },
          { to: '/temporal', label: 'Temporal Analysis' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              fontSize: 13,
              fontFamily: 'DM Sans',
              color: isActive ? 'var(--blue)' : 'var(--text-dim)',
              borderBottom: isActive ? '2px solid var(--blue)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'IBM Plex Mono',
        fontSize: 10,
        color: 'var(--text-dim)',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isOnline ? 'var(--tier3)' : health === null ? 'var(--tier2)' : 'var(--tier1)',
          display: 'inline-block',
          boxShadow: isOnline ? '0 0 6px var(--tier3)' : 'none',
        }} />
        {isOnline ? 'SYSTEM ONLINE' : health === null ? 'CONNECTING...' : 'DEGRADED'}
      </div>
    </nav>
  );
}
