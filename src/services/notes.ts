// Not metninden saat ayıklama: "14:30 Diş hekimi" veya "Toplantı 9.15" → saat + temiz metin.
// Yalnızca metnin başındaki ya da sonundaki saat alınır; cümle içindeki sayılara dokunulmaz.

export interface NoteDraft {
  text: string;
  time: string | null; // "HH:mm"
}

const TIME = '([01]?\\d|2[0-3])[:.]([0-5]\\d)';
const LEADING = new RegExp(`^\\s*(?:saat\\s+)?${TIME}\\s*(?:'?(?:de|da|te|ta))?\\s*[-–:]?\\s+`, 'i');
const TRAILING = new RegExp(`\\s+(?:saat\\s+)?${TIME}\\s*(?:'?(?:de|da|te|ta))?\\s*$`, 'i');

const ANY_TIME = new RegExp(TIME);

const pad = (n: string) => n.padStart(2, '0');

export function parseNote(input: string): NoteDraft {
  const raw = input.trim();
  for (const re of [LEADING, TRAILING]) {
    const m = raw.match(re);
    if (!m) continue;
    const text = raw.replace(re, '').trim();
    // Yalnızca saat yazıldıysa ya da metinde ikinci bir saat varsa (aralık) olduğu gibi bırak
    if (!text || ANY_TIME.test(text)) break;
    return { text, time: `${pad(m[1])}:${m[2]}` };
  }
  return { text: raw, time: null };
}
