// Görsel sabitler. Tasarım dili, iki Apple Design Award almış Things 3'ten esinlenir:
// bol beyaz alan, sistem yazı tipi, ince ayrımlar, tek vurgu rengi (mavi) ve yüzen "+" düğmesi.
// Bileşenlerde sabit renk kodu yazılmaz; usePalette() kullanılır.

import { Platform, useColorScheme, type TextStyle } from 'react-native';

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string; // içerik zemini
  sidebar: string; // tablet kenar çubuğu
  card: string; // açık not düzenleyici kartı
  fill: string; // giriş alanı, basılı durum
  text: string;
  textMuted: string;
  textFaint: string;
  separator: string;
  accent: string; // mavi: "+" düğmesi, seçili gün
  onAccent: string;
  today: string; // bugünün rakamı (Apple takvim kırmızısı)
  star: string; // "Bugün" başlığındaki yıldız (Things sarısı)
  check: string; // kutucuk çerçevesi
  danger: string;
  shadow: string;
}

export const LightPalette: Palette = {
  scheme: 'light',
  bg: '#FFFFFF',
  sidebar: '#F5F6F8',
  card: '#FFFFFF',
  fill: '#F2F3F5',
  text: '#1C1D20',
  textMuted: '#7C8089',
  textFaint: '#B4B8BF',
  separator: '#E7E8EB',
  accent: '#2E7CF6',
  onAccent: '#FFFFFF',
  today: '#E6483D',
  star: '#F4C430',
  check: '#C5C8CE',
  danger: '#E6483D',
  shadow: 'rgba(17, 24, 39, 0.14)',
};

export const DarkPalette: Palette = {
  scheme: 'dark',
  bg: '#1E1F23',
  sidebar: '#18191C',
  card: '#2A2C31',
  fill: '#2E3036',
  text: '#ECEDEF',
  textMuted: '#9A9EA6',
  textFaint: '#5E626A',
  separator: '#33353B',
  accent: '#4A8DF8',
  onAccent: '#FFFFFF',
  today: '#FF6A5E',
  star: '#F4C430',
  check: '#5A5E66',
  danger: '#FF6A5E',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

/** Not etiket renkleri; veri tabanında anahtar saklanır (ör. "green") */
export const NoteTags = {
  blue: { light: '#2E7CF6', dark: '#4A8DF8', label: 'Mavi' },
  green: { light: '#34A853', dark: '#4CC36A', label: 'Yeşil' },
  orange: { light: '#F29D38', dark: '#F5AB52', label: 'Turuncu' },
  red: { light: '#E6483D', dark: '#FF6A5E', label: 'Kırmızı' },
  purple: { light: '#9B59D0', dark: '#B07CE0', label: 'Mor' },
} as const;

export type NoteTag = keyof typeof NoteTags;
export const NOTE_TAG_KEYS = Object.keys(NoteTags) as NoteTag[];

/** Etiketi olmayan notun rengi null'dır; eski sürümlerden kalan anahtarlar da güvenle karşılanır */
export function tagColor(tag: string | null | undefined, c: Palette): string | null {
  const t = tag ? NoteTags[tag as NoteTag] : undefined;
  if (!t) return null;
  return c.scheme === 'dark' ? t.dark : t.light;
}

/** Sistem yazı tipi (iOS'ta SF Pro, Android'de Roboto); tipografi ölçeği iOS'un metin stillerini izler */
const family = Platform.select({ web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: undefined });
export const Type = {
  largeTitle: { fontFamily: family, fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontFamily: family, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontFamily: family, fontSize: 17, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontFamily: family, fontSize: 17, fontWeight: '600' },
  sub: { fontFamily: family, fontSize: 15, fontWeight: '400', lineHeight: 20 },
  caption: { fontFamily: family, fontSize: 13, fontWeight: '500' },
  micro: { fontFamily: family, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
} as const satisfies Record<string, TextStyle>;

export const Radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Tabletlerde kenar çubuğu (takvim) ve içerik yan yana dizilir */
export const WIDE_BREAKPOINT = 820;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? DarkPalette : LightPalette;
}
