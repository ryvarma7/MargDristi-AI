import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { Cluster, SimulateResponse } from '../../types';
import { useAppStore } from '../../store/appStore';
import ActionRecommendationCard from './ActionRecommendationCard';

function runSimulation(cluster: Cluster, numOfficers: number): SimulateResponse {
  const violations_prevented = Math.round(cluster.violation_count * (0.12 + numOfficers * 0.08) * (cluster.risk_score / 100));
  const congestion_reduction_pct = Math.round(8 + numOfficers * 3.5);
  const revenue_inr = violations_prevented * 500;
  const commuter_minutes_saved = violations_prevented * 4;
  const prevention_rate = Number((0.12 + numOfficers * 0.08).toFixed(4));
  return {
    prevention_rate,
    violations_prevented,
    congestion_reduction_pct,
    revenue_inr,
    commuter_minutes_saved,
  };
}

const now = new Date();
const CURRENT_HOUR = now.getHours();
const CURRENT_DOW  = now.getDay();

// Build a list of the next 48 half-hour slots from now
function buildTimeSlots(): { label: string; iso: string }[] {
  const slots: { label: string; iso: string }[] = [];
  const base = new Date();
  base.setSeconds(0, 0);
  base.setMinutes(base.getMinutes() >= 30 ? 30 : 0);
  for (let i = 0; i < 48; i++) {
    const d = new Date(base.getTime() + i * 30 * 60 * 1000);
    const hh = d.getHours();
    const mm = d.getMinutes() === 0 ? '00' : '30';
    const period = hh < 12 ? 'AM' : 'PM';
    const display = `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${period}`;
    const dayLabel = i === 0 ? 'Now' : d.toDateString() !== base.toDateString() ? `Tomorrow ${display}` : display;
    slots.push({ label: dayLabel, iso: d.toISOString() });
  }
  return slots;
}

function StatCell({
  label,
  value,
  color = 'var(--cyan)',
  unit,
}: {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      padding: '10px 12px',
    }}>
      <div style={{
        fontSize: 9,
        fontFamily: 'DM Sans',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'IBM Plex Mono',
        fontSize: 18,
        fontWeight: 500,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {unit && (
        <div style={{
          fontSize: 10,
          fontFamily: 'DM Sans',
          color: 'var(--text-faint)',
          marginTop: 3,
        }}>
          {unit}
        </div>
      )}
    </div>
  );
}

type Props = { cluster: Cluster | null };

export default function SimulatorPanel({ cluster }: Props) {
  const numOfficers    = useAppStore((s) => s.numOfficers);
  const setNumOfficers = useAppStore((s) => s.setNumOfficers);
  const selectCluster  = useAppStore((s) => s.selectCluster);
  const addDeployment  = useAppStore((s) => s.addDeployment);
  const addSchedule    = useAppStore((s) => s.addSchedule);
  const deployments    = useAppStore((s) => s.deployments);

  const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  useEffect(() => {
    setSimResult(null);
    setHasRun(false);
  }, [numOfficers]);

  useEffect(() => {
    setSimResult(null);
    setHasRun(false);
  }, [cluster?.cluster_id]);

  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const sliderPct = ((numOfficers - 1) / 4) * 100;

  if (!cluster) {
    if (deployments.length > 0) {
      return (
        <div style={{
          height: '100%',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Recent Deployments
            </div>
            <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
              {deployments.length} zone{deployments.length > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deployments.map((deployment) => (
              <div key={deployment.cluster_id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: 'var(--text)', fontWeight: 600 }}>
                    {deployment.zone_name}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
                    {deployment.num_officers} officer{deployment.num_officers === 1 ? '' : 's'} deployed
                  </div>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
                  {new Date(deployment.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MapContainer
                center={[deployments[0].centroid_lat, deployments[0].centroid_lng]}
                zoom={12}
                style={{ width: '100%', height: '100%', filter: 'brightness(1.3) contrast(1.6) saturate(1.1)' }}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                doubleClickZoom={false}
                scrollWheelZoom={false}
                touchZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {deployments.map((deployment) => (
                  <Marker key={deployment.cluster_id} position={[deployment.centroid_lat, deployment.centroid_lng]} />
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        height: '100%',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--border-active)" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="10" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="20" cy="20" r="3" fill="var(--text-faint)" />
        </svg>
        <div style={{
          color: 'var(--text-dim)',
          fontSize: 12,
          fontFamily: 'DM Sans',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 220,
        }}>
          Select a zone from the map or priority list to simulate enforcement.
        </div>
      </div>
    );
  }

  const TIER_COLOR: Record<string, string> = {
    'Tier 1': '#FF3B3B',
    'Tier 2': '#FF9500',
    'Tier 3': '#00C853',
  };

  const tierColor = TIER_COLOR[cluster.tier] ?? 'var(--blue)';
  const prevRate  = simResult ? Math.round(simResult.prevention_rate * 100) : null;

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Sans' }}>
          Enforcement Simulator
        </div>
        <button
          onClick={() => selectCluster(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Zone info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              background: tierColor,
              color: cluster.tier === 'Tier 3' ? '#06080F' : 'white',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 6px',
              fontFamily: 'DM Sans',
            }}>
              {cluster.tier}
            </div>
          </div>
          <div style={{
            fontSize: 15,
            fontFamily: 'DM Sans',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}>
            {cluster.zone_name}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            color: 'var(--cyan)',
          }}>
            Predicted today: {cluster.violation_count.toLocaleString()} violations
          </div>
        </div>

        {/* Officer slider */}
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: 'DM Sans',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            Deploy how many officers
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={numOfficers}
            className="md-slider"
            style={{
              '--slider-pct': `${sliderPct}%`,
            } as React.CSSProperties}
            onChange={(e) => setNumOfficers(Number(e.target.value))}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
          }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: numOfficers === n ? 'var(--cyan)' : 'var(--text-faint)',
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            color: 'var(--cyan)',
            textAlign: 'center',
            marginTop: 6,
          }}>
            {numOfficers} {numOfficers === 1 ? 'OFFICER' : 'OFFICERS'}
          </div>
        </div>

        {/* Run Simulation Button */}
        {!hasRun && (
          <button
            onClick={() => {
              const res = runSimulation(cluster, numOfficers);
              setSimResult(res);
              setHasRun(true);
            }}
            style={{
              background: 'var(--purple)',
              color: 'white',
              border: 'none',
              height: 38,
              fontFamily: 'DM Sans',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'background 0.15s',
              borderRadius: 4,
              width: '100%',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--purple-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--purple)')}
          >
            RUN SIMULATION
          </button>
        )}

        {/* Results grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}>
          <StatCell
            label="Prevented"
            value={simResult?.violations_prevented ?? '—'}
            unit="violations"
          />
          <StatCell
            label="Congestion"
            value={simResult ? `↓${simResult.congestion_reduction_pct}%` : '—'}
            unit="reduction"
          />
          <StatCell
            label="Revenue"
            value={simResult ? `₹${simResult.revenue_inr.toLocaleString()}` : '—'}
            unit="est. fines"
          />
          <StatCell
            label="Time Saved"
            value={simResult ? `${simResult.commuter_minutes_saved}m` : '—'}
            unit="commuter mins"
          />
        </div>

        {/* Demo Mode Badge */}
        {simResult !== null && (
          <div style={{
            background: 'rgba(0, 200, 255, 0.08)',
            border: '1px solid rgba(0, 200, 255, 0.2)',
            padding: '8px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontFamily: 'DM Sans',
            color: 'var(--cyan)',
            textAlign: 'center',
            fontWeight: 500,
          }}>
            Demo Mode — Results generated from historical analysis
          </div>
        )}

        {/* Action Recommendation Card */}
        <ActionRecommendationCard cluster={cluster} />

        {/* Simulator Credibility — How was this estimated? */}
        {simResult && (
          <div style={{
            background: 'rgba(155, 114, 255, 0.05)',
            border: '1px solid rgba(155, 114, 255, 0.15)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: 9,
                fontFamily: 'DM Sans',
                color: 'var(--purple)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}>
                🧮 How was this estimated?
              </div>
              <div style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
                color: 'var(--text-faint)',
                background: 'rgba(155,114,255,0.1)',
                border: '1px solid rgba(155,114,255,0.2)',
                padding: '2px 7px',
              }}>
                Confidence: {Math.min(70 + Math.round(cluster.risk_score / 40), 94)}%
              </div>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Based on:
            </div>
            {[
              { label: 'Historical hotspot density', val: `${cluster.violation_count.toLocaleString()} violations recorded` },
              { label: 'MIS score (risk index)',      val: `Score ${cluster.risk_score.toFixed(0)}` },
              { label: 'Similar hotspot patterns',   val: `CIS avg ${cluster.avg_cis.toFixed(2)}` },
              { label: 'Peak-hour recurrence',       val: `Peak at ${cluster.peak_hour}:00` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--purple)', fontSize: 10, marginTop: 1, flexShrink: 0 }}>•</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: 'DM Sans', color: 'var(--text-dim)' }}>{label}</span>
                  <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)', marginLeft: 6 }}>({val})</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {deployments.length > 0 && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Deployments
              </div>
              <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--cyan)' }}>
                {deployments.length} location{deployments.length > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {deployments.slice(0, 3).map((deployment) => (
                <div key={deployment.cluster_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deployment.zone_name}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
                      {deployment.num_officers} officer{deployment.num_officers === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-faint)' }}>
                    {new Date(deployment.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: 130, borderRadius: 10, overflow: 'hidden' }}>
              <MapContainer
                center={[deployments[0].centroid_lat, deployments[0].centroid_lng]}
                zoom={12}
                style={{ width: '100%', height: '100%', filter: 'brightness(1.3) contrast(1.6) saturate(1.1)' }}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                doubleClickZoom={false}
                scrollWheelZoom={false}
                touchZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {deployments.map((deployment) => (
                  <Marker
                    key={deployment.cluster_id}
                    position={[deployment.centroid_lat, deployment.centroid_lng]}
                  />
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {prevRate !== null && (
          <div style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'var(--purple)',
            textAlign: 'center',
          }}>
            {prevRate}% prevention rate · CIS impact reduced by {Math.round((simResult?.violations_prevented ?? 0) * 0.2)} pts
          </div>
        )}

        {/* Scheduler panel — shown inline when SCHEDULE is pressed */}
        {showScheduler && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(255, 200, 0, 0.35)',
            borderRadius: 12,
            padding: '14px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: '#FFC800', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                📅 Schedule Deployment
              </div>
              <button
                onClick={() => { setShowScheduler(false); setScheduleMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'var(--text-dim)' }}>
              {cluster.zone_name} · {numOfficers} officer{numOfficers === 1 ? '' : 's'}
            </div>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(255, 200, 0, 0.3)',
                borderRadius: 8,
                color: selectedSlot ? '#FFC800' : 'var(--text-dim)',
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
                padding: '8px 10px',
                outline: 'none',
                width: '100%',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Select time slot…</option>
              {timeSlots.map((slot) => (
                <option key={slot.iso} value={slot.iso}>{slot.label}</option>
              ))}
            </select>
            <button
              disabled={!selectedSlot}
              onClick={() => {
                if (!selectedSlot) return;
                addSchedule({
                  cluster_id: cluster.cluster_id,
                  zone_name: cluster.zone_name,
                  centroid_lat: cluster.centroid_lat,
                  centroid_lng: cluster.centroid_lng,
                  num_officers: numOfficers,
                  scheduled_time: selectedSlot,
                });
                const label = timeSlots.find((s) => s.iso === selectedSlot)?.label ?? '';
                setScheduleMsg(`Scheduled for ${label}`);
                setShowScheduler(false);
                setSelectedSlot('');
                selectCluster(null);
              }}
              style={{
                background: selectedSlot ? '#FFC800' : 'rgba(255,200,0,0.15)',
                color: selectedSlot ? '#06080F' : 'rgba(255,200,0,0.4)',
                border: 'none',
                height: 36,
                fontFamily: 'DM Sans',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.06em',
                cursor: selectedSlot ? 'pointer' : 'not-allowed',
                borderRadius: 8,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              CONFIRM SCHEDULE
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <button style={{
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            height: 38,
            fontFamily: 'DM Sans',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--blue)')}
          onClick={() => {
            if (!cluster) return;
            addDeployment({
              cluster_id: cluster.cluster_id,
              zone_name: cluster.zone_name,
              centroid_lat: cluster.centroid_lat,
              centroid_lng: cluster.centroid_lng,
              num_officers: numOfficers,
              deployedAt: new Date().toISOString(),
            });
            selectCluster(null);
          }}
          >
            {deploying ? 'DEPLOYING…' : 'DEPLOY NOW'}
          </button>
          <button
            onClick={() => { setShowScheduler((v) => !v); setScheduleMsg(null); }}
            style={{
              background: showScheduler ? 'rgba(255,200,0,0.12)' : 'transparent',
              color: '#FFC800',
              border: '1px solid rgba(255,200,0,0.4)',
              height: 36,
              fontFamily: 'DM Sans',
              fontSize: 12,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {showScheduler ? 'CANCEL' : 'SCHEDULE'}
          </button>
          {scheduleMsg && (
            <div style={{ fontSize: 12, color: '#FFC800', textAlign: 'center', fontFamily: 'IBM Plex Mono' }}>
              ✓ {scheduleMsg}
            </div>
          )}
          {deployMsg && (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>{deployMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
