// Yerel veri modeli tipleri. src/db/schema.ts içindeki tablolarla birebir eşleşir.

export type CoverType = 'leather' | 'kraft' | 'linen';
export type PaperType = 'ivory' | 'kraft' | 'aged';
export type PageType = 'lined' | 'grid' | 'dot' | 'blank';

export interface Notebook {
  id: string;
  title: string;
  cover_type: CoverType;
  paper_type: PaperType;
  created_at: number; // Unix ms
}

export interface Page {
  id: string;
  notebook_id: string;
  date: string | null; // ISO tarih (YYYY-MM-DD); serbest sayfalarda null
  page_type: PageType;
  background_style: PaperType;
}

/** Tek bir kalem vuruşu noktası: x, y ve basınç (0..1). */
export type StrokePoint = [x: number, y: number, pressure: number];

export interface Stroke {
  id: string;
  page_id: string;
  points_json: string; // JSON.stringify(StrokePoint[])
  stroke_color: string;
  stroke_width: number;
}

export interface Entry {
  id: string;
  page_id: string | null; // Inbox (Havuz) girişlerinde null
  time_slot: string | null; // "HH:mm"
  text_content: string;
  is_completed: boolean;
  audio_path: string | null;
  is_inbox: boolean;
  created_at: number; // Unix ms; aynı saat çizgisindeki girişlerin sırası
  color: string | null; // renk etiketi anahtarı (theme.ts → NoteTags)
}
