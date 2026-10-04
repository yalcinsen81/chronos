// Web önizlemesi: tarayıcıda alarm çalınmaz; alarm ayarı yine de kaydedilir (telefonda çalar).

import type { EntryWithDate } from '../db/repository';

export const remindersSupported = false;

export async function requestReminderPermission(): Promise<boolean> {
  return false;
}

export async function cancelReminder(_notificationId: string | null) {}

export async function scheduleReminder(_note: EntryWithDate): Promise<string | null> {
  return null;
}

export async function cancelSnooze(_entryId: string) {}

export async function snoozeReminder(_note: EntryWithDate, _minutes?: number): Promise<void> {}

export interface AlarmAction {
  entryId: string;
  date: string | null;
  action: 'open' | 'snooze' | 'done';
}

export function listenAlarmActions(_handler: (a: AlarmAction) => void): () => void {
  return () => undefined;
}
