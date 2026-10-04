// Şablonlar: sık kullanılan notlar (başlık + alt görev maddeleri). Ayarlar tablosunda JSON olarak saklanır.

import { joinChecklist } from './checklist';
import { joinNote } from './notes';

export interface Template {
  id: string;
  title: string;
  items: string[];
}

export function parseTemplates(json: string | null): Template[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((t): t is Template => Boolean(t) && typeof t.id === 'string' && typeof t.title === 'string')
      .map((t) => ({
        id: t.id,
        title: t.title,
        items: Array.isArray(t.items) ? t.items.filter((i) => typeof i === 'string' && i.trim()) : [],
      }));
  } catch {
    return [];
  }
}

export const serializeTemplates = (list: Template[]) => JSON.stringify(list);

/** Şablondan notun metni: ilk satır başlık, maddeler açıklamada "[ ]" satırları */
export function templateToText(t: Template): string {
  return joinNote(
    t.title,
    joinChecklist(
      '',
      t.items.map((text) => ({ done: false, text })),
    ),
  );
}

/** "Süt\nEkmek" biçiminde yazılan satırlardan madde listesi */
export const itemsFromLines = (lines: string): string[] =>
  lines
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
