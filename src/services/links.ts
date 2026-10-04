// Metindeki web adreslerini bulur (notta dokunulabilir bağlantı olarak gösterilir).

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;

/** Metindeki benzersiz bağlantılar; "www." ile başlayanlara https:// eklenir, sondaki noktalama atılır */
export function extractLinks(text: string): string[] {
  const out: string[] = [];
  for (const m of text.match(URL_RE) ?? []) {
    const clean = m.replace(/[.,;:!?]+$/, '');
    const url = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

/** Çip üzerinde gösterilecek kısa ad: alan adı + yol (en çok 28 karakter) */
export function linkLabel(url: string): string {
  const s = url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
  return s.length > 28 ? `${s.slice(0, 27)}…` : s;
}
