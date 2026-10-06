// Etiket (renk) adları: kullanıcı renklere "İş", "Ev" gibi isim verir; ayarlarda JSON olarak saklanır (saf, testli).

export type TagNames = Record<string, string>;

export const MAX_TAG_NAME = 14;

/** Kayıtlı JSON'u okur; bozuk ya da yanlış türdeki değerleri atar */
export function parseTagNames(raw: string | null | undefined): TagNames {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out: TagNames = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') {
        const name = v.trim().slice(0, MAX_TAG_NAME);
        if (name) out[k] = name;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Bir adı ekler/siler (boş ad varsayılana döner) ve yeni sözlüğü verir */
export function withTagName(names: TagNames, key: string, name: string): TagNames {
  const next = { ...names };
  const clean = name.trim().slice(0, MAX_TAG_NAME);
  if (clean) next[key] = clean;
  else delete next[key];
  return next;
}

/** Gösterilecek ad: kullanıcının verdiği, yoksa varsayılan renk adı */
export const tagLabel = (names: TagNames, key: string, fallback: string): string => names[key] ?? fallback;
