// Not arama (saf, birim testli): Türkçe harflere ve büyük/küçük harfe duyarsız.

import type { EntryWithDate } from '../db/repository';

/** "İLAÇ", "ilaç", "Ilac" hepsi "ilac" olur */
export function fold(s: string): string {
  return s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

/**
 * Metne ve (varsa) renk etiketine göre notları süzer. Sorgu boşsa yalnızca renge bakılır; ikisi de boşsa liste boş döner.
 * Sonuçlar tarihe göre yeniden eskiye sıralanır.
 */
export function searchNotes(
  entries: EntryWithDate[],
  query: string,
  color: string | null,
  limit = 80,
): EntryWithDate[] {
  const q = fold(query.trim());
  if (!q && !color) return [];
  return entries
    .filter((e) => (!color || e.color === color) && (!q || fold(e.text_content).includes(q)))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.time_slot ?? '').localeCompare(a.time_slot ?? ''))
    .slice(0, limit);
}
