// Yıl ısı haritası ve tamamlama istatistiği (saf, birim testli). Girdi: tarihli notların (tarih, tamamlandı) özeti.

import { addDays, startOfWeek, weekdayIndex, type ISODate } from './calendar';

export interface StatEntry {
  date: ISODate;
  done: boolean;
}

export interface HeatCell {
  date: ISODate;
  count: number;
}

/** Günlük not sayısı: tarih → adet */
export function countByDate(entries: StatEntry[]): Record<ISODate, number> {
  const out: Record<ISODate, number> = {};
  for (const e of entries) out[e.date] = (out[e.date] ?? 0) + 1;
  return out;
}

/** Yılın hafta sütunları (hafta başı ayara göre); yıl dışındaki günler null */
export function yearGrid(counts: Record<ISODate, number>, year: number): (HeatCell | null)[][] {
  const first = `${year}-01-01` as ISODate;
  const last = `${year}-12-31` as ISODate;
  const weeks: (HeatCell | null)[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        return date >= first && date <= last ? { date, count: counts[date] ?? 0 } : null;
      }),
    );
  }
  return weeks;
}

/** Isı haritası koyuluğu: 0 boş … 4 çok dolu */
export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export interface Summary {
  monthTotal: number;
  monthDone: number;
  yearTotal: number;
  yearDone: number;
  /** Yıl içinde en az bir not bitirilen gün sayısı */
  activeDays: number;
  /** En çok not bitirilen haftanın günü (0 = Pazartesi); hiç yoksa null */
  bestWeekday: number | null;
  /** Üst üste en az bir not bitirilen en uzun gün sayısı (tüm veri) */
  longestRun: number;
  /** Şu an süren seri: bugün ya da dün biten bir gün varsa sayılır */
  currentRun: number;
}

export function summarize(entries: StatEntry[], today: ISODate): Summary {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  let monthTotal = 0;
  let monthDone = 0;
  let yearTotal = 0;
  let yearDone = 0;
  const doneDays = new Set<ISODate>();
  const weekdayDone = Array<number>(7).fill(0);
  for (const e of entries) {
    if (e.date.startsWith(month)) {
      monthTotal++;
      if (e.done) monthDone++;
    }
    if (e.date.startsWith(year)) {
      yearTotal++;
      if (e.done) yearDone++;
    }
    if (e.done) {
      doneDays.add(e.date);
      weekdayDone[weekdayIndex(e.date)]++;
    }
  }
  const activeDays = [...doneDays].filter((d) => d.startsWith(year)).length;
  const max = Math.max(...weekdayDone);
  const bestWeekday = max > 0 ? weekdayDone.indexOf(max) : null;

  const days = [...doneDays].sort();
  let longestRun = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > longestRun) longestRun = run;
    prev = d;
  }
  // Bugün henüz bir şey bitmediyse dünden geriye sayılır (günün bitmesi seriyi bozmaz)
  let currentRun = 0;
  let cursor: ISODate = doneDays.has(today) ? today : addDays(today, -1);
  while (doneDays.has(cursor)) {
    currentRun++;
    cursor = addDays(cursor, -1);
  }
  return { monthTotal, monthDone, yearTotal, yearDone, activeDays, bestWeekday, longestRun, currentRun };
}
