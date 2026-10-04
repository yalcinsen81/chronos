// Görsel sabitler. Sıcak "kağıt" dili (kullanıcı Claude arayüzünün sıcaklığını istedi):
// fildişi zemin, sıcak gri çizgiler, kil/terrakota vurgu rengi ve tırnaklı (serif) başlıklar.
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
  accent: string; // kil rengi: bugün, saat, alarm
  accentSoft: string; // açık kil zemini: etkin alarm çipi
  onAccent: string;
  today: string; // bugünün rakamı
  star: string; // hardal sarısı
  check: string; // kutucuk çerçevesi
  danger: string;
  shadow: string;
}

export const LightPalette: Palette = {
  scheme: 'light',
  bg: '#FAF9F5',
  sidebar: '#F0EEE6',
  card: '#FFFEFB',
  fill: '#F0EDE4',
  text: '#2B2A26',
  textMuted: '#7A776D',
  textFaint: '#B3AFA3',
  separator: '#E6E1D4',
  accent: '#C2613F',
  accentSoft: '#F6E5DC',
  onAccent: '#FFFFFF',
  today: '#C2613F',
  star: '#D9A441',
  check: '#C9C3B4',
  danger: '#B84A3E',
  shadow: 'rgba(60, 45, 30, 0.18)',
};

export const DarkPalette: Palette = {
  scheme: 'dark',
  bg: '#262624',
  sidebar: '#1F1E1D',
  card: '#30302E',
  fill: '#3A3936',
  text: '#ECEAE3',
  textMuted: '#A6A39A',
  textFaint: '#6B6964',
  separator: '#3C3B37',
  accent: '#D97757',
  accentSoft: '#4A3128',
  onAccent: '#FFFFFF',
  today: '#E88A6B',
  star: '#E0B25A',
  check: '#66635C',
  danger: '#E07A6B',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

/** Not etiket renkleri; veri tabanında anahtar saklanır (ör. "green") */
export const NoteTags = {
  blue: { light: '#5B7FA8', dark: '#7F9FC4', label: 'Mavi' },
  green: { light: '#6A8F5B', dark: '#8DB07C', label: 'Yeşil' },
  orange: { light: '#D08A2E', dark: '#E0A453', label: 'Turuncu' },
  red: { light: '#B84A3E', dark: '#E07A6B', label: 'Kırmızı' },
  purple: { light: '#8A68A6', dark: '#AE8FC7', label: 'Mor' },
} as const;

export type NoteTag = keyof typeof NoteTags;
export const NOTE_TAG_KEYS = Object.keys(NoteTags) as NoteTag[];

/** Etiketi olmayan notun rengi null'dır; eski sürümlerden kalan anahtarlar da güvenle karşılanır */
export function tagColor(tag: string | null | undefined, c: Palette): string | null {
  const t = tag ? NoteTags[tag as NoteTag] : undefined;
  if (!t) return null;
  return c.scheme === 'dark' ? t.dark : t.light;
}

/** Gövde metni sistem yazı tipi; başlıklar sıcak bir tırnaklı yazı tipi (cihazda hazır olan, paket gerekmez) */
const family = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});
const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
});
export const Type = {
  largeTitle: { fontFamily: serif, fontSize: 32, fontWeight: '600', letterSpacing: -0.4 },
  title: { fontFamily: serif, fontSize: 21, fontWeight: '600', letterSpacing: -0.2 },
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
