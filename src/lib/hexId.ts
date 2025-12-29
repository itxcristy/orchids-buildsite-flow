/**
 * Utility functions for generating and working with hexadecimal IDs
 * instead of standard UUIDs with dashes
 */

/**
 * Generate a random 32-character hexadecimal ID
 */
export const generateHexId = (): string => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

/**
 * Convert a standard UUID to hexadecimal format (remove dashes)
 */
export const uuidToHex = (uuid: string): string => {
  return uuid.replace(/-/g, '');
};

/**
 * Convert hexadecimal ID back to UUID format (add dashes)
 */
export const hexToUuid = (hex: string): string => {
  if (hex.length !== 32) {
    throw new Error('Hexadecimal ID must be 32 characters long');
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
};

/**
 * Validate if a string is a valid hexadecimal ID
 */
export const isValidHexId = (id: string): boolean => {
  return /^[0-9a-f]{32}$/i.test(id);
};

/**
 * Generate a sequential hex ID based on timestamp and random component
 */
export const generateSequentialHexId = (): string => {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).slice(2, 22).padEnd(20, '0');
  return (timestamp + random).slice(0, 32);
};