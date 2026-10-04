// Görsel sabitler: sade, modern açık/koyu tema. Bileşenlerde sabit renk kodu yazılmaz.

import { useColorScheme } from 'react-native';

export interface Palette {
  bg: string; // sayfa zemini
  surface: string; // kartlar, takvim paneli
  surfaceAlt: string; // giriş alanı, basılı durum
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  accent: string;
  accentSoft: string; // seçili olmayan vurgu zemini
  onAccent: string;
  danger: string;
}

export const LightPalette: Palette = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F4',
  text: '#14161A',
  textMuted: '#5E6470',
  textFaint: '#A4A9B3',
  border: '#E3E6EB',
  accent: '#3D5AFE',
  accentSoft: '#E8ECFF',
  onAccent: '#FFFFFF',
  danger: '#E5484D',
};

export const DarkPalette: Palette = {
  bg: '#0E0F12',
  surface: '#17191E',
  surfaceAlt: '#22252C',
  text: '#F2F3F5',
  textMuted: '#A0A6B1',
  textFaint: '#5D636E',
  border: '#2A2E36',
  accent: '#7B8CFF',
  accentSoft: '#232845',
  onAccent: '#0E0F12',
  danger: '#FF6B6F',
};

export const Radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Tabletlerde takvim ve notlar yan yana dizilir */
export const WIDE_BREAKPOINT = 760;

/** Sistem temasına (açık/koyu) göre renk paleti */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? DarkPalette : LightPalette;
}
