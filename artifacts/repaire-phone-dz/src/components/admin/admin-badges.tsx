/**
 * Shared admin badge components — consistent status/stock colors across all
 * admin pages. Light + dark mode support, accessible contrast ratios.
 *
 * StockBadge and isCriticalStock live in @/components/ui/stock-badge and are
 * re-exported here so admin pages only need one import.
 */
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export the shared storefront StockBadge so admin pages stay in sync
export { StockBadge, isCriticalStock } from '@/components/ui/stock-badge';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Each semantic meaning maps to one set of Tailwind classes so the whole admin
// panel stays visually consistent.

export const statusTokens = {
  success:  'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700',
  warning:  'bg-amber-100   text-amber-700   border-amber-300   dark:bg-amber-900/40   dark:text-amber-400   dark:border-amber-700',
  danger:   'bg-red-100     text-red-700     border-red-300     dark:bg-red-900/40     dark:text-red-400     dark:border-red-700',
  danger_solid: 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:text-white dark:border-red-600',
  orange:   'bg-orange-100  text-orange-700  border-orange-300  dark:bg-orange-900/40  dark:text-orange-400  dark:border-orange-700',
  info:     'bg-blue-100    text-blue-700    border-blue-300    dark:bg-blue-900/40    dark:text-blue-400    dark:border-blue-700',
  purple:   'bg-purple-100  text-purple-700  border-purple-300  dark:bg-purple-900/40  dark:text-purple-400  dark:border-purple-700',
  indigo:   'bg-indigo-100  text-indigo-700  border-indigo-300  dark:bg-indigo-900/40  dark:text-indigo-400  dark:border-indigo-700',
  neutral:  'bg-gray-100    text-gray-600    border-gray-300    dark:bg-gray-800       dark:text-gray-400    dark:border-gray-700',
} as const;

// ── Product status badges ─────────────────────────────────────────────────────

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn(
      'bg-orange-500 hover:bg-orange-500 text-white border-orange-600',
      'text-[10px] py-0 leading-none h-[18px] w-fit px-1.5',
      className
    )}>
      En avant
    </Badge>
  );
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn(
      'bg-blue-600 hover:bg-blue-600 text-white border-blue-700',
      'text-[10px] py-0 leading-none h-[18px] w-fit px-1.5',
      className
    )}>
      Nouveau
    </Badge>
  );
}

export function PromotionBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn(
      'bg-red-500 hover:bg-red-500 text-white border-red-600',
      'text-[10px] py-0 leading-none h-[18px] w-fit px-1.5',
      className
    )}>
      Promotion
    </Badge>
  );
}

export function ActiveBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusTokens.success, 'text-xs font-medium', className)}>
      Actif
    </Badge>
  );
}

export function InactiveBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusTokens.neutral, 'text-xs font-medium', className)}>
      Inactif
    </Badge>
  );
}
