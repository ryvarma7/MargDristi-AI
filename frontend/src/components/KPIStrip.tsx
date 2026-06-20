import { useMemo } from 'react';
import { Cluster } from '../types';
import { useAppStore } from '../store/appStore';

function formatBig(n: number): string {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const disp   = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${period}`;
}

// Inline SVG icons — no emoji, no library dependency
const IconAlertTriangle = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconShield = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconClock = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCrosshair = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/>
    <line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/>
    <line x1="12" y1="22" x2="12" y2="18"/>
  </svg>
);
const IconTrendingUp = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

type KpiIcon = 'alert' | 'shield' | 'clock' | 'crosshair' | 'trending';

function KpiIcon({ icon, color }: { icon: KpiIcon; color: string }) {
  switch (icon) {
    case 'alert':     return <IconAlertTriangle color={color} />;
    case 'shield':    return <IconShield color={color} />;
    case 'clock':     return <IconClock color={color} />;
    case 'crosshair': return <IconCrosshair color={color} />;
    case 'trending':  return <IconTrendingUp color={color} />;
  }
}

type Props = { clusters: Cluster[] };

export default function KPIStrip({ clusters }: Props) {
  const deployments = useAppStore((s) => s.deployments);
  const schedules   = useAppStore((s) => s.schedules);

  const kpis = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    const tier1 = clusters.filter((c) => c.tier === 'Tier 1');
    const tier1And2 = clusters.filter((c) => c.tier === 'Tier 1' || c.tier === 'Tier 2');

    const deployedIds  = new Set(deployments.map((d) => d.cluster_id));
    const scheduledIds = new Set(schedules.map((s) => s.cluster_id));

    const unassigned = tier1And2.filter(
      (c) => !deployedIds.has(c.cluster_id) && !scheduledIds.has(c.cluster_id)
    );

    const upcomingPeak = clusters.filter((c) => {
      const hours = (c.peak_hour - currentHour + 24) % 24;
      return hours >= 0 && hours <= 3;
    });

    const recommended = clusters.filter(
      (c) => c.tier === 'Tier 1' && !deployedIds.has(c.cluster_id)
    );

    return [
      {
        id: 'active_risk',
        label: 'ACTIVE HIGH-RISK',
        value: tier1.length.toString(),
        sub: 'Tier 1 zones · deploy now',
        color: tier1.length > 0 ? 'var(--tier1)' : 'var(--tier3)',
        urgent: tier1.length > 0,
        icon: 'alert' as KpiIcon,
      },
      {
        id: 'unassigned',
        label: 'UNASSIGNED HOTSPOTS',
        value: unassigned.length.toString(),
        sub: 'High-risk · no coverage',
        color: unassigned.length > 3 ? 'var(--tier1)' : unassigned.length > 0 ? 'var(--tier2)' : 'var(--tier3)',
        urgent: unassigned.length > 0,
        icon: 'shield' as KpiIcon,
      },
      {
        id: 'peak_events',
        label: 'UPCOMING PEAK EVENTS',
        value: upcomingPeak.length.toString(),
        sub: upcomingPeak.length > 0
          ? `Next: ${fmtHour(upcomingPeak.sort((a, b) => {
              const ha = (a.peak_hour - currentHour + 24) % 24;
              const hb = (b.peak_hour - currentHour + 24) % 24;
              return ha - hb;
            })[0]?.peak_hour ?? 0)}`
          : 'No peaks in next 3h',
        color: upcomingPeak.length > 0 ? 'var(--tier2)' : 'var(--text-dim)',
        urgent: upcomingPeak.length > 0,
        icon: 'clock' as KpiIcon,
      },
      {
        id: 'recommended',
        label: 'RECOMMENDED DEPLOYS',
        value: recommended.length.toString(),
        sub: 'Priority-ranked zones',
        color: recommended.length > 0 ? 'var(--cyan)' : 'var(--tier3)',
        urgent: false,
        icon: 'crosshair' as KpiIcon,
      },
      {
        id: 'deployments_today',
        label: 'DEPLOYMENTS TODAY',
        value: deployments.length.toString(),
        sub: `${formatBig(clusters.reduce((s, c) => s + c.violation_count, 0))} total violations`,
        color: 'var(--purple)',
        urgent: false,
        icon: 'trending' as KpiIcon,
      },
    ];
  }, [clusters, deployments, schedules]);

  return (
    <div style={{
      height: 76,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      {kpis.map((k, i) => (
        <div
          key={k.id}
          style={{
            flex: 1,
            borderRight: i < kpis.length - 1 ? '1px solid var(--border)' : 'none',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Urgency glow strip */}
          {k.urgent && clusters.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: k.color,
              opacity: 0.7,
            }} />
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 3,
          }}>
            <KpiIcon icon={k.icon} color={clusters.length === 0 ? 'var(--text-faint)' : k.color} />
            <div style={{
              fontSize: 9,
              fontFamily: 'DM Sans',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {k.label}
            </div>
          </div>

          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 20,
            fontWeight: 500,
            color: clusters.length === 0 ? 'var(--text-faint)' : k.color,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {clusters.length === 0 ? '—' : k.value}
          </div>

          <div style={{
            fontSize: 9,
            color: 'var(--text-faint)',
            fontFamily: 'DM Sans',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
