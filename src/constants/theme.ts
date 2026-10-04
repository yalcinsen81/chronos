// Görsel sabitler: açık/koyu palet, renk etiketleri, yazı tipleri ve ölçüler.
// Bileşenlerde sabit renk kodu yazılmaz; usePalette() kullanılır.

import { useColorScheme } from 'react-native';

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string; // sayfa zemini
  surface: string; // kartlar
  surfaceAlt: string; // giriş alanı, basılı durum, pasif düğme
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  /** Özet kartı ve gönder düğmesi gradyanı */
  hero: readonly [string, string, string];
  onHero: string;
  onHeroMuted: string;
  shadow: string;
}

export const LightPalette: Palette = {
  scheme: 'light',
  bg: '#F4F5FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F7',
  text: '#0F1222',
  textMuted: '#5B6075',
  textFaint: '#A3A8BA',
  border: '#E6E8F0',
  accent: '#5B5BF6',
  accentSoft: '#ECECFE',
  onAccent: '#FFFFFF',
  danger: '#E5484D',
  hero: ['#4F46E5', '#7C3AED', '#C026D3'],
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.72)',
  shadow: 'rgba(40, 40, 110, 0.10)',
};

export const DarkPalette: Palette = {
  scheme: 'dark',
  bg: '#0B0C14',
  surface: '#151724',
  surfaceAlt: '#1F2233',
  text: '#F3F4FA',
  textMuted: '#A2A7BD',
  textFaint: '#5E6378',
  border: '#262A3D',
  accent: '#8B8BFF',
  accentSoft: '#25274A',
  onAccent: '#0B0C14',
  danger: '#FF6B6F',
  hero: ['#3730A3', '#6D28D9', '#A21CAF'],
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.68)',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

/** Not renk etiketleri; veri tabanında anahtar (ör. "green") saklanır */
export const NoteTags = {
  indigo: { light: '#5B5BF6', dark: '#8B8BFF', label: 'Mor' },
  green: { light: '#16A34A', dark: '#4ADE80', label: 'Yeşil' },
  amber: { light: '#D97706', dark: '#FBBF24', label: 'Turuncu' },
  rose: { light: '#E11D48', dark: '#FB7185', label: 'Kırmızı' },
  sky: { light: '#0284C7', dark: '#38BDF8', label: 'Mavi' },
} as const;

export type NoteTag = keyof typeof NoteTags;
export const NOTE_TAG_KEYS = Object.keys(NoteTags) as NoteTag[];

export function tagColor(tag: string | null | undefined, c: Palette): string {
  const t = NoteTags[(tag ?? 'indigo') as NoteTag] ?? NoteTags.indigo;
  return c.scheme === 'dark' ? t.dark : t.light;
}

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Tabletlerde panel ve notlar yan yana dizilir */
export const WIDE_BREAKPOINT = 820;

/** Kartlar için yumuşak gölge (iOS/web shadow, Android elevation) */
export function cardShadow(c: Palette) {
  return {
    shadowColor: c.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  } as const;
}

/** Sistem temasına (açık/koyu) göre renk paleti */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? DarkPalette : LightPalette;
}
