/**
 * StockBadge — shared component used in the storefront AND admin panel.
 * Explicit hex-level colors (no opacity tricks) guarantee readability in
 * both Light and Dark mode.
 */
import { XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockBadgeProps {
  stock: number;
  className?: string;
}

export function StockBadge({ stock, className }: StockBadgeProps) {
  const base =
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[13px] font-semibold leading-none select-none';

  if (stock === 0) {
    return (
      <span
        className={cn(base, className)}
        style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FCA5A5' }}
      >
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        Rupture de stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span
        className={cn(base, className)}
        style={{ background: '#FEE2E2', color: '#DC2626', borderColor: '#F87171' }}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Stock critique ({stock})
      </span>
    );
  }
  if (stock <= 10) {
    return (
      <span
        className={cn(base, className)}
        style={{ background: '#FFEDD5', color: '#C2410C', borderColor: '#FB923C' }}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Stock faible ({stock})
      </span>
    );
  }
  if (stock <= 30) {
    return (
      <span
        className={cn(base, className)}
        style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' }}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Stock limité ({stock})
      </span>
    );
  }
  return (
    <span
      className={cn(base, className)}
      style={{ background: '#DCFCE7', color: '#15803D', borderColor: '#4ADE80' }}
    >
      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
      En stock ({stock})
    </span>
  );
}

/** Returns true when stock level warrants a red row highlight in tables. */
export function isCriticalStock(stock: number): boolean {
  return stock <= 5;
}
