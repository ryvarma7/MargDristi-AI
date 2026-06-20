import React, { useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { deployParkingEnforcement } from '../../api/endpoints';

interface ParkingPriority {
  cluster_id: number;
  zone_name: string;
  priority_rank: number;
  priority_score: number;
  violation_count: number;
  congestion_impact: number;
  peak_hours: string;
  location_context: string;
  recommended_officers: number;
  enforcement_gap_hours: number;
}

interface Props {
  priorities: ParkingPriority[];
  onSelect?: (priority: ParkingPriority) => void;
  selectedId?: number | null;
}

export default function ParkingPrioritiesPanel({ priorities, onSelect, selectedId }: Props) {
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleDeploy = async (priority: ParkingPriority) => {
    setDeployingId(priority.cluster_id);
    setNotification(null);

    try {
      await deployParkingEnforcement({
        cluster_id: priority.cluster_id,
        num_officers: priority.recommended_officers,
        deploy_date: new Date().toISOString().split('T')[0],
      });
      setNotification(`✓ Deployed ${priority.recommended_officers} officers to ${priority.zone_name}`);
    } catch (err) {
      setNotification(`✗ Deployment failed for ${priority.zone_name}`);
      console.error('Deployment error:', err);
    } finally {
      setDeployingId(null);
      window.setTimeout(() => setNotification(null), 3000);
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 90) return '#FF3B3B';
    if (score >= 70) return '#FF9500';
    return '#00C853';
  };

  const getContextBadge = (context: string) => {
    if (context.includes('Commercial')) return '#00C8FF';
    if (context.includes('Metro')) return '#9B5DE5';
    if (context.includes('Event')) return '#FF006E';
    return '#FFB703';
  };

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: 10,
        fontFamily: 'DM Sans',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span>Parking Enforcement Priorities</span>
        <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
          {priorities.length} zones
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 90px 100px',
        gap: '0 8px',
        padding: '6px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        {['#', 'ZONE', 'IMPACT', 'ACTION'].map((h) => (
          <div
            key={h}
            style={{
              fontSize: 9,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'DM Sans',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Scrollable rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {priorities.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: 13,
              fontFamily: 'DM Sans',
            }}
          >
            No parking priorities loaded
          </div>
        ) : (
          priorities.map((p, idx) => {
            const isSelected = selectedId === p.cluster_id;
            const isDeploying = deployingId === p.cluster_id;
            const severityColor = getSeverityColor(p.priority_score);
            const contextColor = getContextBadge(p.location_context);

            return (
              <div
                key={p.cluster_id}
                onClick={() => onSelect?.(p)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 90px 100px',
                  gap: '0 8px',
                  alignItems: 'center',
                  padding: '10px 14px',
                  minHeight: 56,
                  borderLeft: `3px solid ${severityColor}`,
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'var(--blue-dim)' : idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background =
                    idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)';
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 11,
                  color: 'var(--text-faint)',
                  fontWeight: 600,
                }}>
                  {p.priority_rank}
                </div>

                {/* Zone info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 0,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                  }}>
                    <div style={{
                      fontSize: 12,
                      fontFamily: 'DM Sans',
                      color: isSelected ? 'white' : 'var(--text)',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}>
                      {p.zone_name}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 6px',
                      background: contextColor,
                      color: 'white',
                      borderRadius: 3,
                      fontSize: 8,
                      fontFamily: 'IBM Plex Mono',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {p.location_context.split(' ')[0]}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontFamily: 'IBM Plex Mono',
                    color: 'var(--text-faint)',
                  }}>
                    Gap: {p.enforcement_gap_hours.toFixed(1)}h | Peak: {p.peak_hours}
                  </div>
                </div>

                {/* Impact score */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 16,
                    fontWeight: 600,
                    color: severityColor,
                  }}>
                    {p.priority_score.toFixed(0)}
                  </div>
                  <div style={{
                    fontSize: 8,
                    fontFamily: 'IBM Plex Mono',
                    color: 'var(--cyan)',
                  }}>
                    {p.violation_count} violations
                  </div>
                </div>

                {/* Deploy button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeploy(p);
                  }}
                  disabled={isDeploying}
                  style={{
                    background: isDeploying ? 'rgba(0, 200, 255, 0.14)' : 'rgba(0, 200, 255, 0.12)',
                    color: 'var(--cyan)',
                    border: '1px solid rgba(0, 200, 255, 0.22)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 9,
                    fontFamily: 'IBM Plex Mono',
                    fontWeight: 700,
                    cursor: isDeploying ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isDeploying ? 'DEPLOYING' : `SEND ${p.recommended_officers}`}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          padding: '8px 14px',
          background: notification.includes('✓') ? 'rgba(0, 200, 100, 0.12)' : 'rgba(255, 59, 59, 0.12)',
          border: `1px solid ${notification.includes('✓') ? 'rgba(0, 200, 100, 0.22)' : 'rgba(255, 59, 59, 0.22)'}`,
          color: notification.includes('✓') ? 'var(--cyan)' : 'var(--tier1)',
          fontSize: 10,
          fontFamily: 'DM Sans',
          flexShrink: 0,
        }}>
          {notification}
        </div>
      )}
    </div>
  );
}
