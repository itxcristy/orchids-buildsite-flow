import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export interface DateFormatConfig {
  format: string;
  timezone: string;
}

// Default format and timezone
const DEFAULT_CONFIG: DateFormatConfig = {
  format: 'DD/MM/YYYY',
  timezone: 'Asia/Kolkata',
};

/**
 * Format a date according to agency settings
 */
export function formatDate(
  date: Date | string | null | undefined,
  dateFormat?: string,
  timezone?: string
): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const fmt = dateFormat || DEFAULT_CONFIG.format;
    const tz = timezone || DEFAULT_CONFIG.timezone;

    // Convert format string to date-fns format
    const dateFnsFormat = convertDateFormat(fmt);

    // Format the date with timezone support
    if (tz) {
      return formatInTimeZone(dateObj, tz, dateFnsFormat);
    }
    return format(dateObj, dateFnsFormat);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Format a time according to agency settings
 */
export function formatTime(
  date: Date | string | null | undefined,
  timezone?: string
): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const tz = timezone || DEFAULT_CONFIG.timezone;

    // Format the time with timezone support
    if (tz) {
      return formatInTimeZone(dateObj, tz, 'HH:mm');
    }
    return format(dateObj, 'HH:mm');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
}

/**
 * Format a datetime according to agency settings
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  dateFormat?: string,
  timezone?: string
): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const fmt = dateFormat || DEFAULT_CONFIG.format;
    const tz = timezone || DEFAULT_CONFIG.timezone;

    const dateFnsFormat = convertDateFormat(fmt);

    // Format the datetime with timezone support
    if (tz) {
      return formatInTimeZone(dateObj, tz, `${dateFnsFormat} HH:mm`);
    }
    return format(dateObj, `${dateFnsFormat} HH:mm`);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '-';
  }
}

/**
 * Convert custom date format string to date-fns format
 */
function convertDateFormat(formatStr: string): string {
  // Map common format patterns
  const formatMap: Record<string, string> = {
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'DD-MM-YYYY': 'dd-MM-yyyy',
    'MMM DD, YYYY': 'MMM dd, yyyy',
  };

  return formatMap[formatStr] || formatStr;
}

/**
 * Get current date in specified timezone
 */
export function getCurrentDate(timezone?: string): Date {
  const tz = timezone || DEFAULT_CONFIG.timezone;
  if (tz) {
    // Get current time in the specified timezone
    const now = new Date();
    const zonedDate = toZonedTime(now, tz);
    return zonedDate;
  }
  return new Date();
}

/**
 * Check if a date is a working day
 */
export function isWorkingDay(
  date: Date | string,
  workingDays: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dayName = format(dateObj, 'EEEE').toLowerCase();
  return workingDays.includes(dayName);
}

/**
 * Check if current time is within working hours
 */
export function isWorkingHours(
  time: Date | string,
  startTime: string = '09:00',
  endTime: string = '18:00',
  timezone?: string
): boolean {
  try {
    const timeObj = typeof time === 'string' ? parseISO(time) : time;
    const tz = timezone || DEFAULT_CONFIG.timezone;

    // Convert to zoned time if timezone is specified
    const zonedTime = tz ? toZonedTime(timeObj, tz) : timeObj;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const currentHour = zonedTime.getHours();
    const currentMin = zonedTime.getMinutes();

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = currentHour * 60 + currentMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (error) {
    console.error('Error checking working hours:', error);
    return false;
  }
}

