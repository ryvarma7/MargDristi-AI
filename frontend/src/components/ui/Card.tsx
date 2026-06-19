import React from 'react';

type Props = {
  children: React.ReactNode;
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  className?: string;
};

const borderColors: Record<NonNullable<Props['tier']> | 'default', string> = {
  'Tier 1': 'border-[var(--tier1)]',
  'Tier 2': 'border-[var(--tier2)]',
  'Tier 3': 'border-[var(--tier3)]',
  default: 'border-[var(--blue)]',
};

export default function Card({ children, tier, className = '' }: Props) {
  const borderColor = tier ? borderColors[tier] : borderColors.default;
  return (
    <div
      className={`bg-[var(--bg-surface)] border-l-4 ${borderColor} p-4 ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </div>
  );
}
