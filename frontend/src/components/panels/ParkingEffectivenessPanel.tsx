import React, { useEffect, useState } from 'react';
import { getParkingEffectiveness, getParkingStats } from '../../api/endpoints';

export default function ParkingEffectivenessPanel() {
  const [effectiveness, setEffectiveness] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [eff, st] = await Promise.all([getParkingEffectiveness(undefined, 10), getParkingStats()]);
        setEffectiveness(eff);
        setStats(st);
      } catch (err) {
        console.error('Failed to load effectiveness data:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 180000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: 16,
      gap: 16,
    }}>
      {/* Header */}
      <div>
        <div style={{
          fontSize: 13,
          fontFamily: 'DM Sans',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 4,
        }}>
          Enforcement Effectiveness
        </div>
        <div style={{
          fontSize: 10,
          fontFamily: 'IBM Plex Mono',
          color: 'var(--text-faint)',
        }}>
          Post-deployment metrics & impact analysis
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{
              fontSize: 9,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              Total Violations
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'IBM Plex Mono',
              fontWeight: 700,
              color: 'var(--cyan)',
            }}>
              {stats.total_violations}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{
              fontSize: 9,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              Avg Congestion Impact
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'IBM Plex Mono',
              fontWeight: 700,
              color: 'var(--purple)',
            }}>
              {stats.avg_congestion_impact_pct.toFixed(1)}%
            </div>
          </div>

          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{
              fontSize: 9,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              Critical Zones
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'IBM Plex Mono',
              fontWeight: 700,
              color: 'var(--tier1)',
            }}>
              {stats.critical_zones}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{
              fontSize: 9,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              Top Violation
            </div>
            <div style={{
              fontSize: 13,
              fontFamily: 'DM Sans',
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {stats.top_violation_type}
            </div>
          </div>
        </div>
      )}

      {/* Deployments list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          fontWeight: 600,
        }}>
          Recent Deployments
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 11,
            padding: 16,
          }}>
            Loading…
          </div>
        ) : effectiveness.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 11,
            padding: 16,
          }}>
            No deployments yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {effectiveness.map((item) => (
              <div
                key={item.deployment_id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 10,
                }}
              >
                <div style={{
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 6,
                }}>
                  {item.cluster_id} | {item.officers_deployed} officers
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  fontSize: 9,
                  color: 'var(--text-dim)',
                }}>
                  <div>Before: {item.violations_before}</div>
                  <div>After: {item.violations_after}</div>
                  <div style={{ color: 'var(--cyan)' }}>
                    Prevention: {item.prevention_rate_pct.toFixed(0)}%
                  </div>
                  <div style={{ color: 'var(--purple)' }}>
                    Congestion: -{item.congestion_reduction_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
