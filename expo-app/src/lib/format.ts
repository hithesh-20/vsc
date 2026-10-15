import type { OrderStatus, UdhaarStatus } from './types';
import { colors } from './theme';

export function inr(value: number | null | undefined, fraction = 0): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })}`;
}

export function qty(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function orderStatusColor(status: OrderStatus): { fg: string; bg: string } {
  switch (status) {
    case 'PENDING':
      return { fg: colors.amber, bg: colors.amberSoft };
    case 'ACCEPTED':
      return { fg: colors.blue, bg: colors.blueSoft };
    case 'PACKED':
      return { fg: colors.purple, bg: colors.purpleSoft };
    case 'OUT_FOR_DELIVERY':
      return { fg: colors.primary, bg: colors.primarySoft };
    case 'COMPLETED':
      return { fg: colors.green, bg: colors.greenSoft };
    case 'CANCELLED':
      return { fg: colors.red, bg: colors.redSoft };
    default:
      return { fg: colors.textMuted, bg: colors.surfaceAlt };
  }
}

export const ORDER_FLOW: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
];

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const terminal: OrderStatus[] = ['COMPLETED', 'CANCELLED'];
  if (terminal.includes(status)) return null;
  const idx = ORDER_FLOW.indexOf(status);
  if (idx === -1 || idx >= ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[idx + 1];
}

export function udhaarStatusColor(status: UdhaarStatus): { fg: string; bg: string } {
  switch (status) {
    case 'UNPAID':
      return { fg: colors.red, bg: colors.redSoft };
    case 'PARTIAL':
      return { fg: colors.amber, bg: colors.amberSoft };
    case 'SETTLED':
      return { fg: colors.green, bg: colors.greenSoft };
    default:
      return { fg: colors.textMuted, bg: colors.surfaceAlt };
  }
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
