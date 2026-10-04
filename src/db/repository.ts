// Veri erişim katmanı. UI bu fonksiyonlar dışında SQL yazmaz.

import type { ISODate } from '../services/calendar';
import type { Entry, Notebook, Page, PageType, PaperType, StrokePoint } from '../types/models';
import type { Row, SqlDriver } from './driver';
import { newId } from './id';

export interface StoredStroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
}

/** Görüntüleme için girişin bağlı olduğu gün de döner */
export interface EntryWithDate extends Entry {
  date: ISODate | null;
}

const toNotebook = (r: Row): Notebook => ({
  id: String(r.id),
  title: String(r.title),
  cover_type: r.cover_type as Notebook['cover_type'],
  paper_type: r.paper_type as PaperType,
  created_at: Number(r.created_at),
});

const toPage = (r: Row): Page => ({
  id: String(r.id),
  notebook_id: String(r.notebook_id),
  date: (r.date as string | null) ?? null,
  page_type: r.page_type as PageType,
  background_style: r.background_style as PaperType,
});

const toEntry = (r: Row): EntryWithDate => ({
  id: String(r.id),
  page_id: (r.page_id as string | null) ?? null,
  time_slot: (r.time_slot as string | null) ?? null,
  text_content: String(r.text_content),
  is_completed: Number(r.is_completed) === 1,
  audio_path: (r.audio_path as string | null) ?? null,
  is_inbox: Number(r.is_inbox) === 1,
  created_at: Number(r.created_at ?? 0),
  date: (r.date as string | null) ?? null,
});

const ENTRY_SELECT = `SELECT e.*, p.date AS date FROM entries e LEFT JOIN pages p ON p.id = e.page_id`;

export function createRepository(db: SqlDriver) {
  async function ensureDefaultNotebook(title = 'Chronos Paper'): Promise<Notebook> {
    const rows = await db.execute('SELECT * FROM notebooks ORDER BY created_at LIMIT 1');
    if (rows[0]) return toNotebook(rows[0]);
    const nb: Notebook = { id: newId(), title, cover_type: 'leather', paper_type: 'ivory', created_at: Date.now() };
    await db.execute(
      'INSERT INTO notebooks (id, title, cover_type, paper_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [nb.id, nb.title, nb.cover_type, nb.paper_type, nb.created_at],
    );
    return nb;
  }

  async function findPage(notebookId: string, date: ISODate): Promise<Page | null> {
    const rows = await db.execute('SELECT * FROM pages WHERE notebook_id = ? AND date = ?', [notebookId, date]);
    return rows[0] ? toPage(rows[0]) : null;
  }

  /** Günün sayfasını döner; yoksa defterin varsayılan kağıdıyla oluşturur. */
  async function getOrCreatePage(notebookId: string, date: ISODate, pageType: PageType = 'dot'): Promise<Page> {
    const existing = await findPage(notebookId, date);
    if (existing) return existing;
    const [nb] = await db.execute('SELECT paper_type FROM notebooks WHERE id = ?', [notebookId]);
    const page: Page = {
      id: newId(),
      notebook_id: notebookId,
      date,
      page_type: pageType,
      background_style: ((nb?.paper_type as PaperType) ?? 'ivory'),
    };
    // Aynı anda iki istek gelirse UNIQUE indeks ikincisini yok sayar
    await db.execute(
      'INSERT OR IGNORE INTO pages (id, notebook_id, date, page_type, background_style) VALUES (?, ?, ?, ?, ?)',
      [page.id, page.notebook_id, page.date, page.page_type, page.background_style],
    );
    return (await findPage(notebookId, date)) ?? page;
  }

  async function setPageType(pageId: string, pageType: PageType): Promise<void> {
    await db.execute('UPDATE pages SET page_type = ? WHERE id = ?', [pageType, pageId]);
  }

  // --- Vuruşlar -----------------------------------------------------------

  async function listStrokes(pageId: string): Promise<StoredStroke[]> {
    const rows = await db.execute('SELECT * FROM strokes WHERE page_id = ? ORDER BY rowid', [pageId]);
    return rows.map((r) => ({
      id: String(r.id),
      points: JSON.parse(String(r.points_json)) as StrokePoint[],
      color: String(r.stroke_color),
      width: Number(r.stroke_width),
    }));
  }

  async function addStroke(pageId: string, stroke: Omit<StoredStroke, 'id'>): Promise<StoredStroke> {
    const id = newId();
    // Koordinatlar 0.1 px hassasiyete yuvarlanarak JSON boyutu küçültülür
    const points = stroke.points.map(
      ([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100] as StrokePoint,
    );
    await db.execute(
      'INSERT INTO strokes (id, page_id, points_json, stroke_color, stroke_width) VALUES (?, ?, ?, ?, ?)',
      [id, pageId, JSON.stringify(points), stroke.color, stroke.width],
    );
    return { id, ...stroke, points };
  }

  async function deleteStroke(id: string): Promise<void> {
    await db.execute('DELETE FROM strokes WHERE id = ?', [id]);
  }

  // --- Girişler -----------------------------------------------------------

  interface NewEntry {
    text: string;
    date?: ISODate | null;
    time?: string | null;
    audioPath?: string | null;
  }

  /** Tarih verilmezse giriş Havuz'a (Inbox) düşer. */
  async function createEntry(notebookId: string, input: NewEntry): Promise<EntryWithDate> {
    const page = input.date ? await getOrCreatePage(notebookId, input.date) : null;
    const entry: EntryWithDate = {
      id: newId(),
      page_id: page?.id ?? null,
      time_slot: input.time ?? null,
      text_content: input.text.trim(),
      is_completed: false,
      audio_path: input.audioPath ?? null,
      is_inbox: !page,
      created_at: Date.now(),
      date: input.date ?? null,
    };
    await db.execute(
      `INSERT INTO entries (id, page_id, time_slot, text_content, is_completed, audio_path, is_inbox, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [entry.id, entry.page_id, entry.time_slot, entry.text_content, entry.audio_path, entry.is_inbox ? 1 : 0, entry.created_at],
    );
    return entry;
  }

  async function listEntriesForDate(notebookId: string, date: ISODate): Promise<EntryWithDate[]> {
    const rows = await db.execute(
      `${ENTRY_SELECT} WHERE p.notebook_id = ? AND p.date = ?
       ORDER BY e.time_slot IS NULL, e.time_slot, e.created_at`,
      [notebookId, date],
    );
    return rows.map(toEntry);
  }

  /** Ay/yıl görünümündeki mürekkep noktaları için gün başına giriş sayısı */
  async function countEntriesByDate(notebookId: string, from: ISODate, to: ISODate): Promise<Record<ISODate, number>> {
    const rows = await db.execute(
      `SELECT p.date AS date, COUNT(e.id) AS n FROM entries e JOIN pages p ON p.id = e.page_id
       WHERE p.notebook_id = ? AND p.date BETWEEN ? AND ? GROUP BY p.date`,
      [notebookId, from, to],
    );
    return Object.fromEntries(rows.map((r) => [String(r.date), Number(r.n)]));
  }

  async function listInbox(): Promise<EntryWithDate[]> {
    const rows = await db.execute(`${ENTRY_SELECT} WHERE e.is_inbox = 1 ORDER BY e.created_at DESC`);
    return rows.map(toEntry);
  }

  /** Havuzdaki (veya başka gündeki) bir girişi hedef güne taşır. */
  async function moveEntryToDate(notebookId: string, entryId: string, date: ISODate, time?: string | null) {
    const page = await getOrCreatePage(notebookId, date);
    if (time === undefined) {
      await db.execute('UPDATE entries SET page_id = ?, is_inbox = 0 WHERE id = ?', [page.id, entryId]);
    } else {
      await db.execute('UPDATE entries SET page_id = ?, is_inbox = 0, time_slot = ? WHERE id = ?', [page.id, time, entryId]);
    }
  }

  async function moveEntryToInbox(entryId: string) {
    await db.execute('UPDATE entries SET page_id = NULL, is_inbox = 1, time_slot = NULL WHERE id = ?', [entryId]);
  }

  async function toggleEntry(entryId: string) {
    await db.execute('UPDATE entries SET is_completed = 1 - is_completed WHERE id = ?', [entryId]);
  }

  async function deleteEntry(entryId: string) {
    await db.execute('DELETE FROM entries WHERE id = ?', [entryId]);
  }

  return {
    ensureDefaultNotebook,
    findPage,
    getOrCreatePage,
    setPageType,
    listStrokes,
    addStroke,
    deleteStroke,
    createEntry,
    listEntriesForDate,
    countEntriesByDate,
    listInbox,
    moveEntryToDate,
    moveEntryToInbox,
    toggleEntry,
    deleteEntry,
  };
}

export type Repository = ReturnType<typeof createRepository>;
