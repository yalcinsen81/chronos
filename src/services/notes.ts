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

/** Kullanıcının saat alanına yazdığını "HH:mm"e çevirir: "9" → "09:00", "930" → "09:30", "14.5" → "14:05".
 *  Boş girişte null, geçersiz girişte undefined döner. */
export function normalizeTime(input: string): string | null | undefined {
  const raw = input.trim();
  if (!raw) return null;
  let h: number;
  let m = 0;
  const sep = raw.match(/^(\d{1,2})\s*[:.\s]\s*(\d{1,2})$/);
  if (sep) {
    h = Number(sep[1]);
    m = Number(sep[2]);
  } else if (/^\d{1,4}$/.test(raw)) {
    if (raw.length <= 2) h = Number(raw);
    else {
      h = Number(raw.slice(0, raw.length - 2));
      m = Number(raw.slice(-2));
    }
  } else return undefined;
  if (h > 23 || m > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Not metni ilk satır başlık, kalan satırlar açıklama olarak saklanır */
export function splitNote(text: string): { title: string; body: string } {
  const i = text.indexOf('\n');
  if (i < 0) return { title: text.trim(), body: '' };
  return { title: text.slice(0, i).trim(), body: text.slice(i + 1).trim() };
}

export function joinNote(title: string, body: string): string {
  const t = title.trim();
  const b = body.trim();
  if (!t) return b;
  return b ? `${t}\n${b}` : t;
}
