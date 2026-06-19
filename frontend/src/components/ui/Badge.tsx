import React from 'react';

type Props = {
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
};

const tierStyles: Record<Props['tier'], string> = {
  'Tier 1': 'bg-[var(--tier1)] text-white',
  'Tier 2': 'bg-[var(--tier2)] text-white',
  'Tier 3': 'bg-[var(--tier3)] text-[var(--bg-base)]',
};

export default function Badge({ tier }: Props) {
  return (
    <span
      className={`inline-block px-2 py-1 text-[11px] font-semibold uppercase ${tierStyles[tier]}`}
      style={{ borderRadius: 0 }}
    >
      {tier}
    </span>
  );
}
