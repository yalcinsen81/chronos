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
