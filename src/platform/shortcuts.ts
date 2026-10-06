// Klavye kısayolları (yalnızca web/masaüstü tarayıcı). Telefonda boş çalışır.

export type ShortcutName = 'compose' | 'search';

export function useGlobalShortcuts(_handlers: Record<string, () => void>) {}

export function useShortcutEvent(_name: ShortcutName, _fn: () => void) {}
