/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrafficLightColor = 'green' | 'yellow' | 'red';

export interface EmotionalEntry {
  id: string;
  dateTimeISO: string; // Editable date and time of the event
  color: TrafficLightColor;
  description: string;
  createdAt: string; // Auto-generated creation date
  syncedToGoogleDocs?: boolean; // Tracking for Google Docs synchronization
}

export interface AppSettings {
  googleClientId: string;
  googleDocId: string;
  lastSyncedAt?: string;
}

export interface PINState {
  hasPIN: boolean;
  isLocked: boolean;
}
