// Klavye kısayolları: bir metin alanına yazmıyorsan tuşlar uygulamayı yönetir.
//   n yeni not · t bugün · ← → önceki/sonraki gün · d gün görünümü · w hafta · z geri al · / ya da Ctrl/Cmd+K ara
import { useEffect, useRef } from 'react';

export type ShortcutName = 'compose' | 'search';

const listeners: Record<ShortcutName, Set<() => void>> = { compose: new Set(), search: new Set() };

export function emitShortcut(name: ShortcutName) {
  listeners[name].forEach((fn) => fn());
}

export function useShortcutEvent(name: ShortcutName, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = () => ref.current();
    listeners[name].add(h);
    return () => void listeners[name].delete(h);
  }, [name]);
}

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useGlobalShortcuts(handlers: Record<string, () => void>) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        emitShortcut('search');
        return;
      }
      if (mod || e.altKey || typing(e.target)) return;
      const map: Record<string, string> = {
        n: 'compose',
        t: 'today',
        d: 'day',
        w: 'week',
        z: 'undo',
        '/': 'search',
        ArrowLeft: 'prev',
        ArrowRight: 'next',
      };
      const name = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!name) return;
      e.preventDefault();
      if (name === 'compose' || name === 'search') emitShortcut(name);
      else ref.current[name]?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
