// Doğal dille ekleme: "yarın 15:00 diş hekimi", "cuma toplantı 10.30", "3 gün sonra rapor", "15 Ekim doğum günü".
// Metnin başındaki ya da sonundaki gün ifadesi tarihe, saat ifadesi saate çevrilir; kalan metin not olur.
// Saf fonksiyon: bugünün tarihi dışarıdan verilir (testlenebilir).

import { addDays, startOfWeek, toISODate, todayISO, type ISODate } from './calendar';
import { parseNote } from './notes';

export interface SmartNote {
  text: string;
  time: string | null; // "HH:mm"
  date: ISODate | null; // null: metinde gün ifadesi yok, çağıran kendi gününü kullanır
}

const FOLD: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };
/** Harf sayısını koruyarak küçük harfe ve aksansız hale çevirir (bulunan konum özgün metinde de geçerli kalır) */
const fold = (s: string) =>
  Array.from(s)
    .map((ch) => {
      const l = ch === 'İ' ? 'i' : ch === 'I' ? 'ı' : ch.toLowerCase();
      return FOLD[l] ?? l;
    })
    .join('');

const WEEKDAYS = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
const MONTHS = [
  'ocak',
  'subat',
  'mart',
  'nisan',
  'mayis',
  'haziran',
  'temmuz',
  'agustos',
  'eylul',
  'ekim',
  'kasim',
  'aralik',
];

type Resolver = (m: RegExpMatchArray, today: ISODate) => ISODate | null;

const PHRASES: { re: string; resolve: Resolver }[] = [
  { re: 'bugun', resolve: (_, t) => t },
  { re: 'yarin', resolve: (_, t) => addDays(t, 1) },
  { re: '(?:obur gun|ertesi gun)', resolve: (_, t) => addDays(t, 2) },
  { re: '(\\d{1,2}) gun sonra', resolve: (m, t) => addDays(t, Number(m[1])) },
  { re: '(\\d{1,2}) hafta sonra', resolve: (m, t) => addDays(t, 7 * Number(m[1])) },
  {
    // "cuma" = bu haftaki/önümüzdeki ilk cuma (bugün cumaysa bugün); "haftaya salı" = gelecek haftanın salısı
    re: `(haftaya |gelecek |onumuzdeki )?(${WEEKDAYS.join('|')})`,
    resolve: (m, t) => {
      const idx = WEEKDAYS.indexOf(m[2]);
      if (m[1]) return addDays(startOfWeek(t), 7 + idx);
      const todayIdx = (new Date(`${t}T00:00:00`).getDay() + 6) % 7;
      return addDays(t, (idx - todayIdx + 7) % 7);
    },
  },
  { re: 'haftaya', resolve: (_, t) => addDays(t, 7) },
  {
    re: `(\\d{1,2}) (${MONTHS.join('|')})(?: (\\d{4}))?`,
    resolve: (m, t) => {
      const day = Number(m[1]);
      const month = MONTHS.indexOf(m[2]);
      const year0 = m[3] ? Number(m[3]) : Number(t.slice(0, 4));
      const make = (y: number) => {
        const d = new Date(y, month, day);
        return d.getMonth() === month && d.getDate() === day ? toISODate(d) : null; // 31 Şubat gibi geçersizler
      };
      const iso = make(year0);
      // Yıl yazılmadıysa ve tarih geçmişse bir sonraki yıl
      return iso && !m[3] && iso < t ? make(year0 + 1) : iso;
    },
  },
];

/** Metnin başındaki ya da sonundaki gün ifadesini ayıklar */
function takeDate(raw: string, today: ISODate): { text: string; date: ISODate } | null {
  const f = fold(raw);
  if (f.length !== raw.length) return null;
  for (const { re, resolve } of PHRASES) {
    for (const anchor of [new RegExp(`^(?:${re})\\s+`), new RegExp(`\\s+(?:${re})$`)]) {
      const m = f.match(anchor);
      if (!m) continue;
      const text = (raw.slice(0, m.index) + raw.slice((m.index ?? 0) + m[0].length)).trim();
      const date = resolve(m, today);
      if (text && date) return { text, date };
    }
  }
  return null;
}

/** "saat 3 te", "3'te", "akşam 8de", "saat 3 buçuk": gün içi saati ayıklar. Sayı tek başına saat sayılmaz; "saat", ek ('te/de) ya da gün dilimi şart. */
function takeTimeWords(raw: string): { text: string; time: string } | null {
  const f = fold(raw);
  if (f.length !== raw.length) return null;
  const core =
    "(?:(sabah|aksam|gece|ogleden sonra|oglen)\\s+)?(saat\\s+)?(\\d{1,2})(?:[:.]([0-5]\\d))?\\s*(?:['’]\\s*)?(te|de|ta|da)?(?:\\s+(bucuk))?";
  for (const anchor of [new RegExp(`^${core}\\s+`), new RegExp(`\\s+${core}$`)]) {
    const m = f.match(anchor);
    if (!m) continue;
    const [, period, saat, hh, mm, suffix, bucuk] = m;
    if (!period && !saat && !suffix) continue; // yalnızca bir sayı: saat değil
    let h = Number(hh);
    if (h > 23) continue;
    const min = mm ? Number(mm) : bucuk ? 30 : 0;
    // 12 saatlik söyleniş: gün dilimi yoksa 1-6 öğleden sonra, 7-11 sabah sayılır
    if (period === 'aksam' || period === 'ogleden sonra') {
      if (h < 12) h += 12;
    } else if (period === 'gece') {
      if (h === 12) h = 0;
      else if (h >= 6 && h < 12) h += 12;
    } else if (!period && !mm && h >= 1 && h <= 6) h += 12;
    const text = (raw.slice(0, m.index) + raw.slice((m.index ?? 0) + m[0].length)).trim();
    if (!text) continue;
    return { text, time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}` };
  }
  return null;
}

export function parseSmart(input: string, today: ISODate = todayISO()): SmartNote {
  let text = input.trim();
  let date: ISODate | null = null;
  const d1 = takeDate(text, today);
  if (d1) ({ text, date } = d1);
  const t = parseNote(text);
  text = t.text;
  if (!t.time) {
    const w = takeTimeWords(text);
    if (w) {
      text = w.text;
      t.time = w.time;
    }
  }
  if (!date) {
    const d2 = takeDate(text, today);
    if (d2) ({ text, date } = d2);
  }
  return { text, time: t.time, date };
}
