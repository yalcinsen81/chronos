// Takvim hesaplamaları. Saf fonksiyonlar; React ve veri tabanından bağımsızdır.
// Tüm günler yerel saatle "YYYY-MM-DD" ISO anahtarı olarak taşınır (saat dilimi kaymasını önler).

export type ISODate = string; // "YYYY-MM-DD"

export const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

export const TR_MONTHS_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const;

/** Pazartesiden başlayan hafta günleri */
export const TR_WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] as const;
export const TR_WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO anahtarını yerel gece yarısına çevirir. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Ay ekler; hedef ayda gün yoksa ayın son gününe sabitlenir (31 Ocak + 1 ay = 28/29 Şubat). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const d = fromISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return toISODate(d);
}

/** month: 0-11 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Pazartesi ... 6 = Pazar */
export function weekdayIndex(iso: ISODate): number {
  return (fromISODate(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

export function startOfMonth(iso: ISODate): ISODate {
  return iso.slice(0, 8) + '01';
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function diffDays(a: ISODate, b: ISODate): number {
  // UTC ile hesaplanır; yaz saati geçişlerinde 23/25 saatlik günler sonucu bozmaz
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** ISO 8601 hafta numarası (Türkiye'de kullanılan sistem) */
export function isoWeekNumber(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export interface DayCell {
  iso: ISODate;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

/** Ay görünümü için 6x7'lik (Pazartesi başlangıçlı) gün matrisi. month: 0-11 */
export function getMonthMatrix(year: number, month: number, today: ISODate = todayISO()): DayCell[][] {
  const first = toISODate(new Date(year, month, 1));
  let cursor = startOfWeek(first);
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = fromISODate(cursor);
      week.push({
        iso: cursor,
        day: d.getDate(),
        inMonth: d.getMonth() === month,
        isToday: cursor === today,
        isWeekend: i >= 5,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface MonthSummary {
  year: number;
  month: number;
  name: string;
  weeks: DayCell[][];
}

export function getYearOverview(year: number, today: ISODate = todayISO()): MonthSummary[] {
  return TR_MONTHS.map((name, month) => ({ year, month, name, weeks: getMonthMatrix(year, month, today) }));
}

/** Zaman tüneli şeridi için merkez günün etrafındaki günler */
export function getTimelineDays(center: ISODate, before: number, after: number): ISODate[] {
  const out: ISODate[] = [];
  for (let i = -before; i <= after; i++) out.push(addDays(center, i));
  return out;
}

/** "4 Ekim 2026" */
export function formatLong(iso: ISODate): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Pazar" */
export function formatWeekday(iso: ISODate): string {
  return TR_WEEKDAYS[weekdayIndex(iso)];
}

/** Günlük sayfadaki saat çizgileri: "07:00" ... "22:00" */
export function getTimeSlots(startHour = 7, endHour = 22): string[] {
  const out: string[] = [];
  for (let h = startHour; h <= endHour; h++) out.push(`${pad(h)}:00`);
  return out;
}

/** Bir saati ait olduğu saat çizgisine yuvarlar: "15:40" → "15:00". Aralık dışı değerler kenara sabitlenir. */
export function slotForTime(time: string, startHour = 7, endHour = 22): string {
  const h = Number(time.split(':')[0]);
  const clamped = Math.min(endHour, Math.max(startHour, Number.isFinite(h) ? h : startHour));
  return `${pad(clamped)}:00`;
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}
