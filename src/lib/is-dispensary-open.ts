
import type { Dispensary } from '@/lib/types';
import { getDay, parse } from 'date-fns';

/**
 * Checks if a dispensary is currently open based on its hours.
 * @param dispensary The dispensary object with an `hours` array.
 * @returns `true` if the dispensary is open, `false` otherwise.
 */
export function isDispensaryOpen(dispensary: Dispensary | null | undefined): boolean {
  if (!dispensary || !dispensary.hours || dispensary.hours.length !== 7) {
    return false; // Cannot determine status, assume closed
  }

  const now = new Date();
  const dayOfWeek = getDay(now); // Sunday: 0, Monday: 1, ..., Saturday: 6
  
  // The 'day' strings in our data are 'Monday', 'Tuesday', etc.
  // We need to map Date-fns's day index to our string format.
  // Or, more simply, map our string format to the index.
  const dayMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayString = dayMapping[dayOfWeek];
  
  const todaysHours = dispensary.hours.find(h => h.day === todayString);

  if (!todaysHours || !todaysHours.isOpen) {
    return false; // Closed today
  }

  // Parse times relative to today's date
  const openTime = parse(todaysHours.open, 'HH:mm', now);
  const closeTime = parse(todaysHours.close, 'HH:mm', now);

  // If close time is on the next day (e.g., closes at 2:00 AM)
  if (closeTime < openTime) {
    closeTime.setDate(closeTime.getDate() + 1);
  }
  
  return now >= openTime && now < closeTime;
}
