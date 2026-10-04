// Alt görevler: notun açıklama (body) kısmında "[ ] madde" / "[x] madde" satırları olarak saklanır.
// Şema değişmez; yedeklerle ve eski sürümlerle uyumludur. Serbest metin satırları olduğu gibi kalır.

export interface ChecklistItem {
  done: boolean;
  text: string;
}

const ITEM = /^\s*(?:[-*]\s*)?\[( |x|X)\]\s?(.*)$/;

/** Açıklamayı serbest metne ve alt görev maddelerine ayırır */
export function splitChecklist(body: string): { text: string; items: ChecklistItem[] } {
  const items: ChecklistItem[] = [];
  const rest: string[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(ITEM);
    if (m) items.push({ done: m[1] !== ' ', text: m[2].trim() });
    else rest.push(line);
  }
  return { text: rest.join('\n').trim(), items };
}

/** Serbest metin + maddeleri tek açıklama metnine birleştirir (boş maddeler atılır) */
export function joinChecklist(text: string, items: ChecklistItem[]): string {
  const lines = items.filter((i) => i.text.trim()).map((i) => `[${i.done ? 'x' : ' '}] ${i.text.trim()}`);
  return [text.trim(), ...lines].filter(Boolean).join('\n');
}

export function checklistProgress(body: string): { done: number; total: number } {
  const { items } = splitChecklist(body);
  return { done: items.filter((i) => i.done).length, total: items.length };
}
