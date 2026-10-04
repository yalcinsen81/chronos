// Local-first SQLite şeması (op-sqlite ile çalıştırılacak).
// Kurulum: src/db/migrate.ts, sorgular: src/db/repository.ts

export const SCHEMA_VERSION = 6;

export const CREATE_TABLES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    cover_type TEXT NOT NULL DEFAULT 'leather',
    paper_type TEXT NOT NULL DEFAULT 'ivory',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY NOT NULL,
    notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    date TEXT,
    page_type TEXT NOT NULL DEFAULT 'dot',
    background_style TEXT NOT NULL DEFAULT 'ivory'
  )`,
  `CREATE TABLE IF NOT EXISTS strokes (
    id TEXT PRIMARY KEY NOT NULL,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    points_json TEXT NOT NULL,
    stroke_color TEXT NOT NULL,
    stroke_width REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    page_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
    time_slot TEXT,
    text_content TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    audio_path TEXT,
    is_inbox INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    reminder_minutes INTEGER,
    notification_id TEXT,
    repeat TEXT,
    series_id TEXT,
    end_time TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  // Günlük sayfaya tarihle hızlı erişim ve Havuz sorguları için indeksler
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_notebook_date ON pages(notebook_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_strokes_page ON strokes(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_page ON entries(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_inbox ON entries(is_inbox)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_series ON entries(series_id)`,
];

/** Sürüm yükseltme adımları: anahtar, adımın getirdiği sürümdür. */
export const UPGRADES: Record<number, readonly string[]> = {
  // v2: notlara renk etiketi
  2: ['ALTER TABLE entries ADD COLUMN color TEXT'],
  // v3: alarm (saatten kaç dakika önce; NULL = alarm yok) ve zamanlanmış bildirimin kimliği
  3: ['ALTER TABLE entries ADD COLUMN reminder_minutes INTEGER', 'ALTER TABLE entries ADD COLUMN notification_id TEXT'],
  // v4: tekrarlayan not (repeat: daily | weekdays | weekly | monthly) ve aynı tekrar zincirindeki notları bağlayan series_id
  4: [
    'ALTER TABLE entries ADD COLUMN repeat TEXT',
    'ALTER TABLE entries ADD COLUMN series_id TEXT',
    'CREATE INDEX IF NOT EXISTS idx_entries_series ON entries(series_id)',
  ],
  // v5: ayarlar (vurgu rengi vb.)
  5: ['CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)'],
  // v6: notun bitiş saati ("HH:mm"; NULL = süre yok)
  6: ['ALTER TABLE entries ADD COLUMN end_time TEXT'],
};
