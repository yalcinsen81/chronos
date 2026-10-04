// Tekrar kuralları (saf, birim testli): bir sonraki tekrarın tarihi ve bir tarihe kadar üretilecek tekrarlar.

import { addDays, addMonths, weekdayIndex, type ISODate } from './calendar';

export type RepeatRule = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export const REPEAT_OPTIONS: readonly { rule: RepeatRule; label: string; short: string }[] = [
  { rule: 'daily', label: 'Her gün', short: 'Her gün' },
  { rule: 'weekdays', label: 'Hafta içi', short: 'Hafta içi' },
  { rule: 'weekly', label: 'Her hafta', short: 'Her hafta' },
  { rule: 'monthly', label: 'Her ay', short: 'Her ay' },
];

export function isRepeatRule(v: string | null | undefined): v is RepeatRule {
  return REPEAT_OPTIONS.some((o) => o.rule === v);
}

export function repeatLabel(rule: string | null | undefined, short = false): string {
  const o = REPEAT_OPTIONS.find((x) => x.rule === rule);
  if (!o) return short ? 'Tekrar' : 'Tekrar yok';
  return short ? o.short : o.label;
}

/** Kurala göre bir sonraki tekrarın günü */
export function nextOccurrence(date: ISODate, rule: RepeatRule): ISODate {
  switch (rule) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'monthly':
      return addMonths(date, 1);
    case 'weekdays': {
      // weekdayIndex: 0 = Pazartesi … 6 = Pazar; Cuma (4) → Pazartesi, Cumartesi (5) → Pazartesi
      const i = weekdayIndex(date);
      return addDays(date, i >= 4 ? 7 - i : 1);
    }
  }
}

/** `last` gününden sonraki tekrarlar, `until` dahil. `max` sonsuz döngüye karşı üst sınırdır. */
export function occurrencesAfter(last: ISODate, rule: RepeatRule, until: ISODate, max = 400): ISODate[] {
  const out: ISODate[] = [];
  let d = nextOccurrence(last, rule);
  while (d <= until && out.length < max) {
    out.push(d);
    d = nextOccurrence(d, rule);
  }
  return out;
}
