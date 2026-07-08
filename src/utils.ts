/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmotionalEntry } from './types';

// Hash PIN using standard Web Crypto SHA-256
export async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "semaforo_emocional_salt_2026"); // adding a salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format date to local Spanish string (e.g., "lunes, 6 de julio de 2026")
export function formatLongDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formatted = formatter.format(date);
    // Capitalize the first letter for elegant headers
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
}

// Format time to Spanish local style (e.g., "09:15")
export function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "00:00";
  }
}

// Convert date string to YYYY-MM-DDTHH:mm for datetime-local input fields
export function toDatetimeLocalInput(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    // Need to generate local timezone representation
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// Generate the plain-text log format requested by the user
export function generatePlainTextLog(entries: EmotionalEntry[], filterStartDate?: string, filterEndDate?: string): string {
  let filtered = [...entries];
  
  if (filterStartDate) {
    const start = new Date(filterStartDate);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter(e => new Date(e.dateTimeISO) >= start);
  }
  
  if (filterEndDate) {
    const end = new Date(filterEndDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(e => new Date(e.dateTimeISO) <= end);
  }

  // Sort chronologically (oldest first for continuous reading, or as sorted group)
  // Let's sort oldest first so appending / reading goes in natural order
  filtered.sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());

  // Group by day string
  const groups: { [key: string]: EmotionalEntry[] } = {};
  filtered.forEach(entry => {
    const dateOnly = new Date(entry.dateTimeISO).toDateString();
    if (!groups[dateOnly]) {
      groups[dateOnly] = [];
    }
    groups[dateOnly].push(entry);
  });

  // Get days in chronological order
  const sortedDays = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let output = "REGISTRO DEL SEMÁFORO EMOCIONAL\n\n";
  if (filterStartDate || filterEndDate) {
    output += `Filtro: ${filterStartDate ? 'Desde ' + filterStartDate : ''} ${filterEndDate ? 'Hasta ' + filterEndDate : ''}\n\n`;
  }

  sortedDays.forEach(dayStr => {
    const dayEntries = groups[dayStr];
    // Get time sort within the day
    dayEntries.sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());
    
    const firstEntryDate = dayEntries[0].dateTimeISO;
    output += `📅 ${formatLongDate(firstEntryDate)}\n`;
    
    dayEntries.forEach(entry => {
      const emoji = entry.color === 'green' ? '🟢' : entry.color === 'yellow' ? '🟡' : '🔴';
      output += `  ${emoji} ${formatTime(entry.dateTimeISO)} — ${entry.description}\n`;
    });
    output += "\n";
  });

  return output.trim();
}

// Helper to check if a date is within this week (starting Monday)
export function isThisWeek(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Get start of current week (Monday)
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return date >= startOfWeek && date < endOfWeek;
  } catch {
    return false;
  }
}

// Helper to check if a date is within this month
export function isThisMonth(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  } catch {
    return false;
  }
}
