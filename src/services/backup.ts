// Yedek: tüm tarihli notları düz bir JSON metnine çevirir ve geri okur (saf, birim testli).
// Hesap ya da sunucu yoktur; metin panoya kopyalanır / paylaşılır, geri yüklerken yapıştırılır.

import type { EntryWithDate } from '../db/repository';

export interface BackupEntry {
  id: string;
  date: string;
  time: string | null;
  end?: string | null;
  text: string;
  done: boolean;
  color: string | null;
  reminder: number | null;
  repeat: string | null;
  series: string | null;
  created: number;
}

export interface Backup {
  app: 'chronos';
  version: 1;
  exportedAt: string;
  entries: BackupEntry[];
}

export function buildBackup(entries: EntryWithDate[], now: Date = new Date()): Backup {
  return {
    app: 'chronos',
    version: 1,
    exportedAt: now.toISOString(),
    entries: entries
      .filter((e) => e.date)
      .map((e) => ({
        id: e.id,
        date: e.date as string,
        time: e.time_slot,
        ...(e.end_time ? { end: e.end_time } : {}),
        text: e.text_content,
        done: e.is_completed,
        color: e.color,
        reminder: e.reminder_minutes,
        repeat: e.repeat,
        series: e.series_id,
        created: e.created_at,
      })),
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export type ParsedBackup = { ok: true; entries: BackupEntry[] } | { ok: false; error: string };

/** Yapıştırılan metni doğrular; geçersiz satırlar atlanır, hiç geçerli not yoksa hata döner. */
export function parseBackup(json: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(json.trim());
  } catch {
    return { ok: false, error: 'Metin geçerli bir yedek değil.' };
  }
  const obj = data as Partial<Backup> | null;
  if (!obj || obj.app !== 'chronos' || !Array.isArray(obj.entries)) {
    return { ok: false, error: 'Bu bir Chronos yedeği değil.' };
  }
  const entries: BackupEntry[] = [];
  for (const raw of obj.entries as Partial<BackupEntry>[]) {
    if (!raw || typeof raw.id !== 'string' || typeof raw.text !== 'string' || typeof raw.date !== 'string') continue;
    if (!ISO.test(raw.date) || !raw.text.trim()) continue;
    entries.push({
      id: raw.id,
      date: raw.date,
      time: typeof raw.time === 'string' && TIME.test(raw.time) ? raw.time : null,
      end: typeof raw.end === 'string' && TIME.test(raw.end) ? raw.end : null,
      text: raw.text,
      done: raw.done === true,
      color: typeof raw.color === 'string' ? raw.color : null,
      reminder: typeof raw.reminder === 'number' ? raw.reminder : null,
      repeat: typeof raw.repeat === 'string' ? raw.repeat : null,
      series: typeof raw.series === 'string' ? raw.series : null,
      created: typeof raw.created === 'number' ? raw.created : Date.now(),
    });
  }
  if (entries.length === 0) return { ok: false, error: 'Yedekte geçerli not bulunamadı.' };
  return { ok: true, entries };
}
