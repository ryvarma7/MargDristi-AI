import React, { useMemo } from 'react';

interface ParkingHeatmapProps {
  matrix: Record<string, Record<number, number>>;
}

export default function ParkingHeatmap({ matrix }: ParkingHeatmapProps) {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  const stats = useMemo(() => {
    let maxCount = 0;
    let minCount = Infinity;
    let totalCount = 0;
    let cellCount = 0;

    Object.values(matrix).forEach((dayData) => {
      Object.values(dayData).forEach((count) => {
        maxCount = Math.max(maxCount, count);
        minCount = Math.min(minCount, count);
        totalCount += count;
        cellCount += 1;
      });
    });

    return {
      maxCount: maxCount || 1,
      minCount: minCount === Infinity ? 0 : minCount,
      avgCount: cellCount > 0 ? totalCount / cellCount : 0,
    };
  }, [matrix]);

  const cellColor = (count: number) => {
    const normalized = (count - stats.minCount) / (stats.maxCount - stats.minCount || 1);
    const hue = (1 - normalized) * 240; // 240=blue, 0=red
    return `hsl(${hue}, 100%, 50%)`;
  };

  const isDarkBackground = (count: number) => {
    const normalized = (count - stats.minCount) / (stats.maxCount - stats.minCount || 1);
    return normalized > 0.5;
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-surface)',
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
        flexShrink: 0,
      }}>
        Parking Temporal Analysis (7 × 24)
      </div>

      {/* Heatmap container */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {/* Hour headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 1, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-faint)', alignSelf: 'center', textAlign: 'center' }}>
            Day
          </div>
          {hourLabels.map((label, i) => (
            <div
              key={i}
              style={{
                fontSize: 8,
                color: 'var(--text-faint)',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap rows */}
        {dayLabels.map((day, dayIdx) => (
          <div
            key={day}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px repeat(24, 1fr)',
              gap: 1,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
            {/* Day label */}
            <div
              style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
                color: 'var(--text-faint)',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {day}
            </div>

            {/* Hour cells */}
            {Array.from({ length: 24 }).map((_, hourIdx) => {
              const count = matrix[day]?.[hourIdx] ?? 0;
              const color = cellColor(count);
              const isDark = isDarkBackground(count);

              return (
                <div
                  key={hourIdx}
                  title={`${day} ${hourIdx}:00 - ${count} violations`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: color,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontFamily: 'IBM Plex Mono',
                    fontWeight: 600,
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 9,
        color: 'var(--text-faint)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 6 }}>
          Scale: <strong>{Math.round(stats.minCount)}</strong> → <strong>{Math.round(stats.maxCount)}</strong> violations
        </div>
        <div>Avg: <strong>{Math.round(stats.avgCount)}</strong> violations/hour</div>
      </div>
    </div>
  );
}
