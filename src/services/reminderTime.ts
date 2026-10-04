// Alarm zamanlaması için saf yardımcılar (React / native modül bağımsız, birim testli).

import type { ISODate } from './calendar';

/** Alarm seçenekleri: saatten kaç dakika önce çalacağı */
export const REMINDER_OPTIONS: readonly { minutes: number; label: string; short: string }[] = [
  { minutes: 0, label: 'Tam saatinde', short: 'Saatinde' },
  { minutes: 5, label: '5 dk önce', short: '5 dk' },
  { minutes: 15, label: '15 dk önce', short: '15 dk' },
  { minutes: 30, label: '30 dk önce', short: '30 dk' },
  { minutes: 60, label: '1 saat önce', short: '1 sa' },
  { minutes: 1440, label: '1 gün önce', short: '1 gün' },
];

export function reminderLabel(minutes: number | null, short = false): string {
  if (minutes == null) return 'Alarm yok';
  const o = REMINDER_OPTIONS.find((x) => x.minutes === minutes);
  if (o) return short ? o.short : o.label;
  return `${minutes} dk önce`;
}

/** Alarmın çalacağı an (yerel saat). Saat yoksa veya alarm kapalıysa null. */
export function reminderFireDate(date: ISODate | null, time: string | null, minutesBefore: number | null): Date | null {
  if (!date || !time || minutesBefore == null) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if ([y, mo, d, h, mi].some((n) => !Number.isFinite(n))) return null;
  return new Date(y, mo - 1, d, h, mi - minutesBefore, 0, 0);
}

/** Zamanlanabilir mi: geçmişte kalan alarm kurulmaz */
export function shouldSchedule(fire: Date | null, now: Date = new Date()): fire is Date {
  return fire !== null && fire.getTime() > now.getTime() + 1000;
}

/** Yaklaşan alarmlar: çalma anı gelecekte olanlar, en yakını önce */
export function upcomingAlarms<
  T extends { date: ISODate | null; time_slot: string | null; reminder_minutes: number | null; is_completed: boolean },
>(entries: T[], now: Date = new Date()): (T & { fireAt: Date })[] {
  return entries
    .filter((e) => !e.is_completed)
    .map((e) => ({ ...e, fireAt: reminderFireDate(e.date, e.time_slot, e.reminder_minutes) }))
    .filter((e): e is T & { fireAt: Date } => e.fireAt !== null && e.fireAt.getTime() > now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
