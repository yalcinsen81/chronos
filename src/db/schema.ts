// Local-first SQLite şeması (op-sqlite ile çalıştırılacak).
// Bağlantı ve migration mantığı sonraki fazlarda src/db/index.ts içine eklenecek.

export const SCHEMA_VERSION = 1;

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
    is_inbox INTEGER NOT NULL DEFAULT 0
  )`,
  // Günlük sayfaya tarihle hızlı erişim ve Havuz sorguları için indeksler
  `CREATE INDEX IF NOT EXISTS idx_pages_notebook_date ON pages(notebook_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_strokes_page ON strokes(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_page ON entries(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_inbox ON entries(is_inbox)`,
];
