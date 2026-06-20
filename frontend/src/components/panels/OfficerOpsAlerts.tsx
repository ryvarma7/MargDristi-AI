import { useMemo } from 'react';
import type { Cluster, OfficerOpsAlert } from '../../types';

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${period}`;
}

const ALERT_META = {
  no_officer:           { icon: '🚨', label: 'No Officer Assigned',    urgencyColor: '#FF3B3B' },
  peak_approaching:     { icon: '⏰', label: 'Peak Window Approaching', urgencyColor: '#FF9500' },
  deployment_overdue:   { icon: '⚠️', label: 'Deployment Overdue',     urgencyColor: '#FF9500' },
  high_risk_uncovered:  { icon: '🔴', label: 'High-Risk Uncovered',    urgencyColor: '#FF3B3B' },
};

type DeploymentSummary = { cluster_id: number };
type ScheduleSummary   = { cluster_id: number; scheduled_time: string };

export function computeOpsAlerts(
  clusters: Cluster[],
  deployments: DeploymentSummary[],
  schedules: ScheduleSummary[],
): OfficerOpsAlert[] {
  const now = new Date();
  const currentHour = now.getHours();
  const alerts: OfficerOpsAlert[] = [];
  const deployedIds = new Set(deployments.map((d) => d.cluster_id));
  const scheduledIds = new Set(schedules.map((s) => s.cluster_id));

  clusters
    .filter((c) => c.tier === 'Tier 1' || c.tier === 'Tier 2')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 12)
    .forEach((cluster) => {
      const isDeployed  = deployedIds.has(cluster.cluster_id);
      const isScheduled = scheduledIds.has(cluster.cluster_id);
      const hoursUntilPeak = (cluster.peak_hour - currentHour + 24) % 24;

      if (cluster.tier === 'Tier 1' && !isDeployed && !isScheduled) {
        alerts.push({
          type: 'high_risk_uncovered',
          cluster_id: cluster.cluster_id,
          zone_name: cluster.zone_name,
          tier: cluster.tier,
          peak_hour: cluster.peak_hour,
          message: `${cluster.zone_name} — Tier 1 zone with no coverage`,
          urgency: 'critical',
        });
      } else if (!isDeployed && !isScheduled) {
        alerts.push({
          type: 'no_officer',
          cluster_id: cluster.cluster_id,
          zone_name: cluster.zone_name,
          tier: cluster.tier,
          peak_hour: cluster.peak_hour,
          message: `${cluster.zone_name} — no officer assigned`,
          urgency: 'warning',
        });
      } else if (!isDeployed && hoursUntilPeak <= 2 && hoursUntilPeak >= 0) {
        alerts.push({
          type: 'peak_approaching',
          cluster_id: cluster.cluster_id,
          zone_name: cluster.zone_name,
          tier: cluster.tier,
          peak_hour: cluster.peak_hour,
          message: `Peak at ${fmtHour(cluster.peak_hour)} — ${hoursUntilPeak}h away`,
          urgency: 'warning',
        });
      }
    });

  // Overdue schedules
  schedules.forEach((s) => {
    const sTime = new Date(s.scheduled_time);
    if (sTime < now && !deployedIds.has(s.cluster_id)) {
      const cluster = clusters.find((c) => c.cluster_id === s.cluster_id);
      if (cluster) {
        alerts.push({
          type: 'deployment_overdue',
          cluster_id: cluster.cluster_id,
          zone_name: cluster.zone_name,
          tier: cluster.tier,
          peak_hour: cluster.peak_hour,
          message: `${cluster.zone_name} — scheduled deployment overdue`,
          urgency: 'warning',
        });
      }
    }
  });

  return alerts.slice(0, 6);
}

type Props = {
  clusters: Cluster[];
  deployments: DeploymentSummary[];
  schedules: ScheduleSummary[];
  onSelect?: (clusterId: number) => void;
};

export default function OfficerOpsAlerts({ clusters, deployments, schedules, onSelect }: Props) {
  const alerts = useMemo(
    () => computeOpsAlerts(clusters, deployments, schedules),
    [clusters, deployments, schedules]
  );

  if (alerts.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'rgba(0, 200, 83, 0.06)',
        border: '1px solid rgba(0, 200, 83, 0.18)',
        borderRadius: 6,
        fontSize: 11,
        fontFamily: 'DM Sans',
        color: '#00C853',
      }}>
        <span>✓</span>
        All high-risk zones have coverage
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontSize: 9,
        fontFamily: 'DM Sans',
        color: 'var(--text-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 2,
      }}>
        Officer Operations Status
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {alerts.map((alert, i) => {
          const meta = ALERT_META[alert.type];
          const isCritical = alert.urgency === 'critical';
          return (
            <div
              key={`${alert.cluster_id}-${alert.type}`}
              className={isCritical ? 'ops-alert-critical' : ''}
              onClick={() => onSelect?.(alert.cluster_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: isCritical
                  ? 'rgba(255, 59, 59, 0.06)'
                  : 'rgba(255, 149, 0, 0.04)',
                border: `1px solid ${isCritical ? 'rgba(255,59,59,0.35)' : 'rgba(255,149,0,0.25)'}`,
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'background 0.15s',
                animationDelay: `${i * 0.15}s`,
              }}
              onMouseEnter={(e) => {
                if (onSelect) (e.currentTarget as HTMLElement).style.background = isCritical
                  ? 'rgba(255,59,59,0.12)'
                  : 'rgba(255,149,0,0.1)';
              }}
              onMouseLeave={(e) => {
                if (onSelect) (e.currentTarget as HTMLElement).style.background = isCritical
                  ? 'rgba(255, 59, 59, 0.06)'
                  : 'rgba(255, 149, 0, 0.04)';
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 9,
                  fontFamily: 'DM Sans',
                  color: meta.urgencyColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  marginBottom: 1,
                }}>
                  {meta.label}
                </div>
                <div style={{
                  fontSize: 11,
                  fontFamily: 'DM Sans',
                  color: 'var(--text-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {alert.message}
                </div>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 2,
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 8,
                  fontFamily: 'IBM Plex Mono',
                  color: 'var(--text-faint)',
                }}>
                  Peak {fmtHour(alert.peak_hour)}
                </div>
                <div style={{
                  fontSize: 8,
                  fontFamily: 'DM Sans',
                  background: alert.tier === 'Tier 1' ? '#FF3B3B' : '#FF9500',
                  color: 'white',
                  padding: '1px 5px',
                }}>
                  {alert.tier}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
