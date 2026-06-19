import React from 'react';

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: Props) {
  const base =
    'font-semibold uppercase tracking-[0.04em] text-sm py-2 px-4 h-9 focus:outline-none';
  const variantClasses =
    variant === 'ghost'
      ? 'border border-[var(--border-active)] bg-transparent text-[var(--blue)]'
      : 'bg-[var(--blue)] text-white hover:bg-[var(--blue-dim)]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variantClasses} ${fullWidth ? 'w-full' : ''} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </button>
  );
}
