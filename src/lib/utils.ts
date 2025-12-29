import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert hexadecimal ID to UUID format for database operations
 */
export function hexToUuid(hex: string): string {
  if (!hex || hex.length !== 32) {
    return hex; // Return as-is if not a valid hex ID
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Convert UUID to hexadecimal format
 */
export function uuidToHex(uuid: string): string {
  if (!uuid) return uuid;
  return uuid.replace(/-/g, '');
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}
