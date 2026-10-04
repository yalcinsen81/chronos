// Chronos Paper görsel sabitleri: kağıt, mürekkep ve ızgara ölçüleri.
// Renkler burada tanımlanır; bileşenlerde sabit renk kodu yazılmaz.

export const PaperColors = {
  ivory: '#FDFBF7', // Varsayılan fildişi kağıt
  kraft: '#D9C3A0', // Kraft kağıt / kapak
  aged: '#F3E9D2', // Eskitilmiş kağıt
  gridDot: 'rgba(60, 50, 40, 0.22)', // Noktalı ızgara rengi
  gridLine: 'rgba(60, 90, 140, 0.18)', // Çizgili / kareli sayfa çizgisi
  margin: 'rgba(190, 60, 60, 0.35)', // Sol kenar boşluğu çizgisi
} as const;

export const InkColors = {
  midnight: '#1B2A4A', // Lacivert dolma kalem mürekkebi
  black: '#1A1A1A',
  sepia: '#5B3A1E',
  red: '#A4262C',
} as const;

// Izgara aralığı (pt). Leuchtturm1917 noktalı sayfası ~5 mm aralıklıdır.
export const GRID_SPACING = 22;
export const DOT_RADIUS = 1.1;

// Varsayılan kalem ayarları (perfect-freehand seçenekleri)
export const DEFAULT_PEN = {
  size: 4,
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.45,
} as const;
