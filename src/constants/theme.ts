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
  bg: '#FCFBF9',
  sidebar: '#F4F1EC',
  card: '#FFFFFF',
  fill: '#F3F0EA',
  text: '#24211E',
  textMuted: '#79736B',
  textFaint: '#B6B0A6',
  separator: '#ECE7DF',
  accent: '#E4572B',
  accentSoft: '#FDEBE3',
  onAccent: '#FFFFFF',
  today: '#E4572B',
  star: '#E9A23B',
  check: '#CFC8BD',
  danger: '#D64545',
  shadow: 'rgba(60, 40, 20, 0.16)',
};

export const DarkPalette: Palette = {
  scheme: 'dark',
  bg: '#1C1B1A',
  sidebar: '#161514',
  card: '#272624',
  fill: '#302E2C',
  text: '#F2EFEA',
  textMuted: '#A8A299',
  textFaint: '#6E6A63',
  separator: '#33312E',
  accent: '#FF7A45',
  accentSoft: '#43271B',
  onAccent: '#1C1B1A',
  today: '#FF7A45',
  star: '#F0B552',
  check: '#6B665E',
  danger: '#F0746B',
  shadow: 'rgba(0, 0, 0, 0.6)',
};

/** Not etiket renkleri; veri tabanında anahtar saklanır (ör. "green") */
export const NoteTags = {
  blue: { light: '#4F7CAC', dark: '#7FA6D4', label: 'Mavi' },
  green: { light: '#4E9A6B', dark: '#74C28F', label: 'Yeşil' },
  orange: { light: '#E9A23B', dark: '#F0B552', label: 'Turuncu' },
  red: { light: '#D64545', dark: '#F0746B', label: 'Kırmızı' },
  purple: { light: '#8E6BB8', dark: '#B292D6', label: 'Mor' },
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
  /** Gün sütunundaki büyük gün numarası */
  dayNumber: { fontFamily: serif, fontSize: 22, fontWeight: '600' },
  body: { fontFamily: family, fontSize: 17, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontFamily: family, fontSize: 17, fontWeight: '600' },
  sub: { fontFamily: family, fontSize: 15, fontWeight: '400', lineHeight: 20 },
  caption: { fontFamily: family, fontSize: 13, fontWeight: '500' },
  micro: { fontFamily: family, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
} as const satisfies Record<string, TextStyle>;

export const Radius = { sm: 6, md: 12, lg: 18, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Tabletlerde kenar çubuğu (takvim) ve içerik yan yana dizilir */
export const WIDE_BREAKPOINT = 820;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? DarkPalette : LightPalette;
}
