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

// Kağıt stillerinin shader parametreleri (renk 0..1 RGB)
export const PaperStyles = {
  ivory: { base: [0.992, 0.984, 0.969], grain: 0.6, fiber: 0.5, aging: 0.15 },
  kraft: { base: [0.851, 0.765, 0.627], grain: 1.0, fiber: 1.0, aging: 0.35 },
  aged: { base: [0.953, 0.914, 0.824], grain: 0.8, fiber: 0.7, aging: 0.9 },
} as const;

// Kapak renkleri (deri / keten)
export const CoverColors = {
  leather: [0.24, 0.14, 0.09],
  kraft: [0.62, 0.48, 0.32],
  linen: [0.18, 0.24, 0.3],
  band: '#2B2B2B', // Elastik bant
  ribbon: '#8E2A2A', // Kumaş ayraç
} as const;

// Kalem paleti (araç çubuğu)
export const PEN_PALETTE = [InkColors.midnight, InkColors.black, InkColors.sepia, InkColors.red] as const;
export const PEN_SIZES = [2.5, 4, 7] as const;

// Post-it ve el yazısı
export const NoteColors = {
  postit: '#FFE98A',
  postitShadow: 'rgba(80, 60, 0, 0.25)',
  pin: '#B23A3A',
} as const;

export const HANDWRITING_FONT = 'Caveat_500Medium';
export const LINE_HEIGHT = 32; // Çizgili sayfa satır aralığı
export const MARGIN_LEFT = 56; // Çizgili sayfada kırmızı kenar çizgisi
