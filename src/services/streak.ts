// Seri sayacı (saf, birim testli): tekrarlayan notun kaç tekrarı üst üste tamamlandı.
// Bugünün tekrarı henüz açıksa seriyi bozmaz; geçmişte tamamlanmamış ilk tekrar seriyi keser.

import type { ISODate } from './calendar';

export interface Occurrence {
  date: ISODate;
  done: boolean;
}

export interface Streak {
  /** Şu an süren seri (bugünden geriye) */
  current: number;
  /** Zincirin en uzun serisi */
  best: number;
}

export function computeStreak(occurrences: Occurrence[], today: ISODate): Streak {
  // Gelecekteki tekrarlar sayılmaz; bugünün açık tekrarı henüz bir başarısızlık değildir
  const past = occurrences
    .filter((o) => o.date <= today && !(o.date === today && !o.done))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let best = 0;
  let run = 0;
  for (const o of past) {
    run = o.done ? run + 1 : 0;
    if (run > best) best = run;
  }
  return { current: run, best };
}

/** Seri rozetinde gösterilecek en küçük değer; tek bir tamamlama "seri" sayılmaz */
export const MIN_VISIBLE_STREAK = 2;
