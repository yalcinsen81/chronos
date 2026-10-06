// Takvim dosyası (.ics, iCalendar): notları Google/Apple Takvim'e verir, oradan etkinlik alır (saf, birim testli).
// Saatler "kayan" yerel saattir (saat dilimi yazılmaz); bu yüzden her takvimde aynı duvar saatinde görünür.

import type { EntryWithDate } from '../db/repository';
import { splitNote } from './notes';

export interface IcsEvent {
  /** Yinelenen içe aktarmayı önlemek için kararlı kimlik */
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm
  endTime: string | null;
  text: string; // başlık (+ açıklama, ilk satır başlık)
}

const pad = (n: number) => String(n).padStart(2, '0');

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function unesc(s: string): string {
  return s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** 75 karakteri aşan satırlar RFC 5545'e göre katlanır */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

const compactDate = (iso: string) => iso.replace(/-/g, '');
const compactDateTime = (iso: string, hhmm: string) => `${compactDate(iso)}T${hhmm.replace(':', '')}00`;

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + mins);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export function buildIcs(entries: EntryWithDate[], now: Date = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chronos//TR', 'CALSCALE:GREGORIAN'];
  for (const e of entries) {
    if (!e.date) continue;
    const { title, body } = splitNote(e.text_content);
    lines.push('BEGIN:VEVENT', `UID:${e.id}@chronos`, `DTSTAMP:${stamp}`);
    if (e.time_slot) {
      lines.push(`DTSTART:${compactDateTime(e.date, e.time_slot)}`);
      lines.push(`DTEND:${compactDateTime(e.date, e.end_time ?? addMinutes(e.time_slot, 45))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`);
    }
    lines.push(`SUMMARY:${esc(title || body)}`);
    if (title && body) lines.push(`DESCRIPTION:${esc(body)}`);
    if (e.is_completed) lines.push('STATUS:COMPLETED');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function parseDateValue(v: string): { date: string; time: string | null } | null {
  const m = v.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  if (m[4] === undefined) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null };
  if (m[7]) {
    // UTC saat: cihazın yerel saatine çevrilir
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

const MAX_EVENTS = 500;

/** Chronos'un kendi dışa aktardığı etkinlik aynı kimliği korur; dışarıdan gelenler içerikten türetilir */
function stableId(uid: string | undefined, date: string, time: string | null, title: string): string {
  if (uid?.endsWith('@chronos')) return uid.slice(0, -'@chronos'.length);
  const src = uid || `${date}|${time ?? ''}|${title}`;
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return `ics-${(h >>> 0).toString(36)}-${src.length.toString(36)}`;
}

/** .ics metninden etkinlikleri okur; çok günlü etkinlik yalnızca ilk güne konur, tekrar kuralları yok sayılır. */
export function parseIcs(text: string): IcsEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT') {
      if (cur?.DTSTART && cur.SUMMARY !== undefined) {
        const start = parseDateValue(cur.DTSTART);
        const end = cur.DTEND ? parseDateValue(cur.DTEND) : null;
        const title = unesc(cur.SUMMARY).trim();
        if (start && title) {
          const desc = cur.DESCRIPTION ? unesc(cur.DESCRIPTION).trim() : '';
          events.push({
            id: stableId(cur.UID, start.date, start.time, title),
            date: start.date,
            time: start.time,
            endTime: start.time && end?.time && end.date === start.date && end.time > start.time ? end.time : null,
            text: desc ? `${title}\n${desc}` : title,
          });
        }
      }
      cur = null;
      if (events.length >= MAX_EVENTS) break;
    } else if (cur) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const name = line.slice(0, i).split(';')[0].toUpperCase();
      if (['UID', 'DTSTART', 'DTEND', 'SUMMARY', 'DESCRIPTION'].includes(name) && !(name in cur)) {
        cur[name] = line.slice(i + 1);
      }
    }
  }
  return events;
}
