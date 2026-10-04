// Doğal dilden görev ayrıştırma (Voice-to-Task ve Quick-Entry için).
//
// chrono-node Türkçe yerel ayar içermez; bu yüzden Türkçe ifadeler için özel chrono
// ayrıştırıcıları (Parser) yazılmıştır. İngilizce metinler chrono.casual ile ayrıştırılır.
// Türkçe metinde İngilizce ayrıştırıcı kullanılmaz: "arabayı sat" gibi ifadelerde "sat"
// kelimesinin Saturday sanılmasını önler.
//
// Örnek: "Yarın 15:00'te Ahmet Bey ile bütçe toplantısı"
//   → { date: <yarın>, time: "15:00", action: "Ahmet Bey ile bütçe toplantısı" }

import * as chrono from 'chrono-node';

import { addDays, addMonths, formatTime, startOfWeek, toISODate, type ISODate } from './calendar';

type Ctx = chrono.ParsingContext;

// \b Türkçe harfleri tanımaz; kelime sınırı için açık harf sınıfı kullanılır.
const L = 'a-zA-ZçğıöşüÇĞİÖŞÜâîû';
const PRE = `(^|[^${L}0-9])`; // grup 1: önceki karakter (sonuca dahil edilmez)
const END = `(?![${L}])`;
const APOS = `['’]?`;
const CASE_SUFFIX = `(?:${APOS}(?:y?[ae]|d[ae]n?|t[ae]n?|ki|n[ıi]n|[ıi]n))?`;

const WEEKDAYS: Record<string, number> = {
  pazartesi: 0, salı: 1, sali: 1, çarşamba: 2, carsamba: 2, perşembe: 3, persembe: 3,
  cuma: 4, cumartesi: 5, pazar: 6,
};
const MONTHS: Record<string, number> = {
  ocak: 0, şubat: 1, subat: 1, mart: 2, nisan: 3, mayıs: 4, mayis: 4, haziran: 5,
  temmuz: 6, ağustos: 7, agustos: 7, eylül: 8, eylul: 8, ekim: 9, kasım: 10, kasim: 10, aralık: 11, aralik: 11,
};
const NUMBER_WORDS: Record<string, number> = {
  bir: 1, iki: 2, üç: 3, uc: 3, dört: 4, dort: 4, beş: 5, bes: 5, altı: 6, alti: 6,
  yedi: 7, sekiz: 8, dokuz: 9, on: 10, onbir: 11, oniki: 12,
};

const lower = (s: string) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

function result(ctx: Ctx, match: RegExpMatchArray, components: chrono.ParsingComponents) {
  // Grup 1 (önceki karakter) sonucun metnine dahil edilmez
  const prefix = match[1] ?? '';
  const text = match[0].slice(prefix.length);
  const res = ctx.createParsingResult((match.index ?? 0) + prefix.length, text);
  res.start = components;
  return res;
}

function dateComponents(ctx: Ctx, iso: ISODate) {
  const [y, m, d] = iso.split('-').map(Number);
  return ctx.createParsingComponents({ year: y, month: m, day: d }).addTag('tr/date');
}

const refISO = (ctx: Ctx) => toISODate(ctx.refDate);

// --- Göreli günler: bugün, yarın, öbür gün, dün -----------------------------
const RelativeDayParser: chrono.Parser = {
  pattern: () =>
    new RegExp(
      `${PRE}(bugün|bugun|yarından sonra|yarindan sonra|yarın|yarin|öbür gün|obur gun|öbürsü gün|ertesi gün|dün|dun)${CASE_SUFFIX}${END}`,
      'i',
    ),
  extract(ctx, match) {
    const word = lower(match[2]);
    const offsets: [RegExp, number][] = [
      [/^bug[üu]n/, 0],
      [/sonra$|^[öo]b[üu]r|^ertesi/, 2],
      [/^yar[ıi]n/, 1],
      [/^d[üu]n/, -1],
    ];
    const offset = offsets.find(([re]) => re.test(word))?.[1] ?? 0;
    return result(ctx, match, dateComponents(ctx, addDays(refISO(ctx), offset)));
  },
};

// --- Hafta günleri: "pazartesi", "gelecek cuma", "haftaya salı günü" -------
const WeekdayParser: chrono.Parser = {
  pattern: () =>
    new RegExp(
      `${PRE}(?:(bu|gelecek|önümüzdeki|onumuzdeki|haftaya|sonraki)\\s+)?` +
        `(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cumartesi|cuma|pazar)` +
        `(?:\\s+g[üu]n[üu])?${CASE_SUFFIX}${END}`,
      'i',
    ),
  extract(ctx, match) {
    const modifier = match[2] ? lower(match[2]) : null;
    const target = WEEKDAYS[lower(match[3])];
    const ref = refISO(ctx);
    let iso: ISODate;
    if (modifier === 'bu') {
      iso = addDays(startOfWeek(ref), target);
    } else if (modifier) {
      // gelecek / önümüzdeki / haftaya → bir sonraki haftanın o günü
      iso = addDays(startOfWeek(ref), 7 + target);
    } else {
      // Belirteç yoksa en yakın gelecek o gün (bugün o günse bugün)
      const today = (ctx.refDate.getDay() + 6) % 7;
      iso = addDays(ref, (target - today + 7) % 7);
    }
    return result(ctx, match, dateComponents(ctx, iso).addTag('tr/weekday'));
  },
};

// --- Göreli süre: "3 gün sonra", "iki hafta sonra", "haftaya", "gelecek ay" -
const RelativeOffsetParser: chrono.Parser = {
  pattern: () =>
    new RegExp(
      `${PRE}(?:(\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\s+(gün|gun|hafta|ay)\\s+(sonra|içinde|icinde)` +
        `|(haftaya|gelecek hafta|önümüzdeki hafta|onumuzdeki hafta|gelecek ay|önümüzdeki ay|onumuzdeki ay))${CASE_SUFFIX}${END}`,
      'i',
    ),
  extract(ctx, match) {
    const ref = refISO(ctx);
    if (match[5]) {
      const phrase = lower(match[5]);
      const iso = phrase.endsWith('ay') ? addMonths(ref, 1) : addDays(ref, 7);
      return result(ctx, match, dateComponents(ctx, iso));
    }
    const raw = lower(match[2]);
    const n = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
    const unit = lower(match[3]);
    const iso = unit === 'ay' ? addMonths(ref, n) : addDays(ref, unit === 'hafta' ? n * 7 : n);
    return result(ctx, match, dateComponents(ctx, iso));
  },
};

// --- Mutlak tarih: "5 Ekim", "5 Ekim 2026'da", "05/10", "5.10.2026" --------
const AbsoluteDateParser: chrono.Parser = {
  pattern: () =>
    new RegExp(
      `${PRE}(?:(\\d{1,2})\\s+(${Object.keys(MONTHS).join('|')})(?:\\s+(\\d{4}))?` +
        `|(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?` +
        `|(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}))${CASE_SUFFIX}${END}`,
      'i',
    ),
  extract(ctx, match) {
    let day: number;
    let month: number; // 0-11
    let year: number | null;
    if (match[2]) {
      day = Number(match[2]);
      month = MONTHS[lower(match[3])];
      year = match[4] ? Number(match[4]) : null;
    } else if (match[5]) {
      day = Number(match[5]);
      month = Number(match[6]) - 1;
      year = match[7] ? Number(match[7].length === 2 ? `20${match[7]}` : match[7]) : null;
    } else {
      day = Number(match[8]);
      month = Number(match[9]) - 1;
      year = Number(match[10]);
    }
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;

    if (year === null) {
      // Yıl verilmemişse ve tarih geçmişte kaldıysa gelecek yıl kastedilmiştir
      const ref = ctx.refDate;
      year = ref.getFullYear();
      const candidate = new Date(year, month, day);
      const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      if (candidate < refMidnight) year += 1;
    }
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) return null; // 31 Şubat gibi geçersiz tarihler
    return result(ctx, match, dateComponents(ctx, toISODate(date)));
  },
};

// --- Saat: "15:00'te", "saat 3'te", "akşam 7'de", "sabah 9.30", "öğlen" ----
const DAYPART = '(sabah|öğleden sonra|ogleden sonra|öğlen|oglen|öğle|ogle|akşam|aksam|gece)';
const TimeParser: chrono.Parser = {
  pattern: () =>
    new RegExp(
      `${PRE}(?:${DAYPART}\\s+)?(?:(saat)\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?(\\s+buçuk|\\s+bucuk)?` +
        `(${APOS}(?:te|ta|de|da|ten|tan|den|dan|e|a|ye|ya|ı|i|u|ü))?${END}` +
        `|${PRE.replace('(', '(?:')}(öğlen|oglen|öğle vakti)${CASE_SUFFIX}${END}`,
      'i',
    ),
  extract(ctx, match) {
    if (match[8]) {
      // Yalnızca "öğlen"
      const prefix = match[0].length - match[0].replace(/^[^a-zA-ZçğıöşüÇĞİÖŞÜ]+/, '').length;
      const res = ctx.createParsingResult((match.index ?? 0) + prefix, match[0].slice(prefix));
      res.start = ctx.createParsingComponents({ hour: 12, minute: 0 }).addTag('tr/time');
      return res;
    }
    const daypart = match[2] ? lower(match[2]) : null;
    const hasSaat = Boolean(match[3]);
    let hour = Number(match[4]);
    let minute = match[5] ? Number(match[5]) : 0;
    const half = Boolean(match[6]);
    const suffix = Boolean(match[7]);

    // Çıplak sayılar ("3 elma") saat değildir: saat, dakika, gün dilimi ya da ek gerekir
    if (!hasSaat && !match[5] && !daypart && !suffix && !half) return null;
    // "2 gün sonra" gibi ifadeleri saat sanma
    const after = ctx.text.slice((match.index ?? 0) + match[0].length);
    if (!hasSaat && !match[5] && /^\s+(gün|gun|hafta|ay|yıl|yil|kişi|kisi|tane|adet)/i.test(after)) return null;
    if (hour > 23 || minute > 59) return null;
    if (half) minute = 30;

    if (daypart && /^(akşam|aksam|öğleden|ogleden)/.test(daypart) && hour < 12) hour += 12;
    else if (daypart === 'gece' && hour >= 6 && hour < 12) hour += 12;
    else if (daypart && /^(öğle|ogle)/.test(daypart) && hour < 6) hour += 12;
    else if (!daypart && !match[5] && hour >= 1 && hour <= 6) hour += 12; // "saat 3'te" iş saatinde 15:00 kabul edilir

    const comps = ctx.createParsingComponents({ hour, minute }).addTag('tr/time');
    return result(ctx, match, comps);
  },
};

const trChrono = new chrono.Chrono({
  parsers: [RelativeDayParser, WeekdayParser, RelativeOffsetParser, AbsoluteDateParser, TimeParser],
  refiners: [],
});

// ---------------------------------------------------------------------------

export type ParseLanguage = 'tr' | 'en' | 'auto';

export interface ParsedEntry {
  /** Hedef gün (tarih ifadesi yoksa ama saat varsa referans gün) */
  date: ISODate | null;
  /** "HH:mm" */
  time: string | null;
  /** Tarih/saat ifadeleri çıkarılmış eylem metni */
  action: string;
  /** Eşleşen tarih/saat ifadeleri (UI'da vurgulamak için) */
  matches: string[];
}

const TR_HINT = /[çğıöşüÇĞİÖŞÜ]|(^|\s)(saat|yarın|yarin|bugün|bugun|ile|için|icin|toplantı|toplanti)(\s|$)/i;

export function detectLanguage(text: string): 'tr' | 'en' {
  return TR_HINT.test(text) ? 'tr' : 'en';
}

interface Span {
  index: number;
  text: string;
}

/** Çakışan sonuçlardan uzun olanı tutar */
function removeOverlaps<T extends Span>(results: T[]): T[] {
  const sorted = [...results].sort((a, b) => b.text.length - a.text.length);
  const kept: T[] = [];
  for (const r of sorted) {
    const overlaps = kept.some((k) => r.index < k.index + k.text.length && k.index < r.index + r.text.length);
    if (!overlaps) kept.push(r);
  }
  return kept.sort((a, b) => a.index - b.index);
}

// Baştaki/sondaki bağlaç ve noktalama artıkları ("saat", "günü", ",", "-" ...)
const LEADING_FILLER = /^(?:[\s,;:\-–—]+|(?:saat|günü|gunu|de|da|ve|için|icin)(?=\s))+/i;
const TRAILING_FILLER = /(?:[\s,;:\-–—.]+|\s(?:saat|günü|gunu|de|da|ve))+$/i;

function cleanAction(text: string, spans: Span[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.index) + ' ';
    cursor = s.index + s.text.length;
  }
  out += text.slice(cursor);
  let prev: string;
  do {
    prev = out;
    out = out.replace(/\s+/g, ' ').trim().replace(LEADING_FILLER, '').replace(TRAILING_FILLER, '').trim();
  } while (out !== prev);
  if (!out) return '';
  const first = out[0] === 'i' ? 'İ' : out[0] === 'ı' ? 'I' : out[0].toUpperCase();
  return first + out.slice(1);
}

/**
 * Serbest metinden tarih, saat ve eylemi ayrıştırır.
 * @param ref Göreli ifadelerin ("yarın") hesaplanacağı referans an
 */
export function parseEntry(text: string, ref: Date = new Date(), lang: ParseLanguage = 'auto'): ParsedEntry {
  const language = lang === 'auto' ? detectLanguage(text) : lang;
  const engine = language === 'tr' ? trChrono : chrono.casual;
  let parsed = engine.parse(text, ref, { forwardDate: true });
  if (lang === 'auto' && language === 'en') {
    // Dil tahmini belirsizken tek başına "sat/sun/mon" gibi kısaltmalar tarih sayılmaz
    // (Türkçe "sat", "sun" fiilleri ile karışır)
    parsed = parsed.filter((r) => !/^(mon|tue|wed|thu|fri|sat|sun)$/i.test(r.text.trim()));
  }
  const results = removeOverlaps(parsed);

  let date: ISODate | null = null;
  let time: string | null = null;
  const used: typeof results = [];

  for (const r of results) {
    const c = r.start;
    const hasDate = c.isCertain('day') || c.isCertain('weekday');
    const hasTime = c.isCertain('hour');
    if (!hasDate && !hasTime) continue;
    let consumed = false;
    if (hasDate && !date) {
      date = toISODate(c.date());
      consumed = true;
    }
    if (hasTime && !time) {
      time = formatTime(c.get('hour') ?? 0, c.get('minute') ?? 0);
      consumed = true;
    }
    if (consumed) used.push(r);
  }

  // Saat var ama gün yoksa referans gün kabul edilir ("15:00'te toplantı" → bugün)
  if (time && !date) date = toISODate(ref);

  return {
    date,
    time,
    action: cleanAction(text, used),
    matches: used.map((r) => r.text),
  };
}
