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
  color: (r.color as string | null) ?? null,
  reminder_minutes: r.reminder_minutes == null ? null : Number(r.reminder_minutes),
  notification_id: (r.notification_id as string | null) ?? null,
  repeat: (r.repeat as string | null) ?? null,
  series_id: (r.series_id as string | null) ?? null,
  date: (r.date as string | null) ?? null,
});

const ENTRY_SELECT = `SELECT e.*, p.date AS date FROM entries e LEFT JOIN pages p ON p.id = e.page_id`;

export function createRepository(db: SqlDriver) {
  async function ensureDefaultNotebook(title = 'Chronos Paper'): Promise<Notebook> {
    const rows = await db.execute('SELECT * FROM notebooks ORDER BY created_at LIMIT 1');
    if (rows[0]) return toNotebook(rows[0]);
    const nb: Notebook = { id: newId(), title, cover_type: 'leather', paper_type: 'ivory', created_at: Date.now() };
    await db.execute('INSERT INTO notebooks (id, title, cover_type, paper_type, created_at) VALUES (?, ?, ?, ?, ?)', [
      nb.id,
      nb.title,
      nb.cover_type,
      nb.paper_type,
      nb.created_at,
    ]);
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
      background_style: (nb?.paper_type as PaperType) ?? 'ivory',
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
    color?: string | null;
    reminderMinutes?: number | null;
    repeat?: string | null;
    /** Tekrar zincirinin kimliği; verilmeden repeat verilirse not zincirin ilk üyesidir */
    seriesId?: string | null;
  }

  /** Tarih verilmezse giriş Havuz'a (Inbox) düşer. */
  async function createEntry(notebookId: string, input: NewEntry): Promise<EntryWithDate> {
    const page = input.date ? await getOrCreatePage(notebookId, input.date) : null;
    const id = newId();
    const entry: EntryWithDate = {
      id,
      page_id: page?.id ?? null,
      time_slot: input.time ?? null,
      text_content: input.text.trim(),
      is_completed: false,
      audio_path: input.audioPath ?? null,
      is_inbox: !page,
      created_at: Date.now(),
      color: input.color ?? null,
      reminder_minutes: input.reminderMinutes ?? null,
      notification_id: null,
      repeat: input.repeat ?? null,
      series_id: input.seriesId ?? (input.repeat ? id : null),
      date: input.date ?? null,
    };
    await db.execute(
      `INSERT INTO entries (id, page_id, time_slot, text_content, is_completed, audio_path, is_inbox, created_at, color, reminder_minutes, repeat, series_id)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.page_id,
        entry.time_slot,
        entry.text_content,
        entry.audio_path,
        entry.is_inbox ? 1 : 0,
        entry.created_at,
        entry.color,
        entry.reminder_minutes,
        entry.repeat,
        entry.series_id,
      ],
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

  /** Haftalık görünüm: tarih aralığındaki tüm notlar (gün, saat, eklenme sırasına göre) */
  async function listEntriesBetween(notebookId: string, from: ISODate, to: ISODate): Promise<EntryWithDate[]> {
    const rows = await db.execute(
      `${ENTRY_SELECT} WHERE p.notebook_id = ? AND p.date BETWEEN ? AND ?
       ORDER BY p.date, e.time_slot IS NULL, e.time_slot, e.created_at`,
      [notebookId, from, to],
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
      await db.execute('UPDATE entries SET page_id = ?, is_inbox = 0, time_slot = ? WHERE id = ?', [
        page.id,
        time,
        entryId,
      ]);
    }
  }

  async function moveEntryToInbox(entryId: string) {
    await db.execute('UPDATE entries SET page_id = NULL, is_inbox = 1, time_slot = NULL WHERE id = ?', [entryId]);
  }

  async function toggleEntry(entryId: string) {
    await db.execute('UPDATE entries SET is_completed = 1 - is_completed WHERE id = ?', [entryId]);
  }

  /** Notun metnini ve saatini günceller (satır içi düzenleme). */
  async function updateEntry(entryId: string, text: string, time: string | null) {
    await db.execute('UPDATE entries SET text_content = ?, time_slot = ? WHERE id = ?', [text.trim(), time, entryId]);
  }

  async function setEntryReminder(entryId: string, minutes: number | null) {
    await db.execute('UPDATE entries SET reminder_minutes = ? WHERE id = ?', [minutes, entryId]);
  }

  async function setNotificationId(entryId: string, notificationId: string | null) {
    await db.execute('UPDATE entries SET notification_id = ? WHERE id = ?', [notificationId, entryId]);
  }

  async function getEntry(entryId: string): Promise<EntryWithDate | null> {
    const rows = await db.execute(`${ENTRY_SELECT} WHERE e.id = ?`, [entryId]);
    return rows[0] ? toEntry(rows[0]) : null;
  }

  /** Uygulama açılışında alarmları yeniden kurmak için: alarmı olan, tamamlanmamış tüm notlar */
  async function listEntriesWithReminder(): Promise<EntryWithDate[]> {
    const rows = await db.execute(`${ENTRY_SELECT} WHERE e.reminder_minutes IS NOT NULL AND e.is_completed = 0`);
    return rows.map(toEntry);
  }

  async function setEntryColor(entryId: string, color: string | null) {
    await db.execute('UPDATE entries SET color = ? WHERE id = ?', [color, entryId]);
  }

  // --- Tekrarlayan notlar ---------------------------------------------------
  // Her tekrar gerçek bir nottur (kendi tamamlanma durumu ve alarmı vardır); aynı zincirdekiler series_id ile bağlıdır.
  // Zincirin son notu (en geç tarihli) şablondur: sonraki tekrarlar ondan türetilir (services/series.ts).

  /** Her zincirin en geç tarihli üyesi (yalnızca tekrarı açık zincirler) */
  async function listSeriesTails(notebookId: string): Promise<EntryWithDate[]> {
    const rows = await db.execute(
      `${ENTRY_SELECT} WHERE p.notebook_id = ? AND e.repeat IS NOT NULL AND e.series_id IS NOT NULL
       AND p.date = (SELECT MAX(p2.date) FROM entries e2 JOIN pages p2 ON p2.id = e2.page_id WHERE e2.series_id = e.series_id)
       GROUP BY e.series_id`,
      [notebookId],
    );
    return rows.map(toEntry);
  }

  /**
   * Notun tekrarını değiştirir (null = durdur). Bu nottan sonraki, tamamlanmamış tekrarlar silinir; yeni kural
   * ilk nottan sonrası için yeniden üretilir. Silinen notların bildirim kimliklerini döner (iptal edilsin).
   */
  async function changeSeries(entryId: string, rule: string | null): Promise<string[]> {
    const entry = await getEntry(entryId);
    if (!entry) return [];
    const sid = entry.series_id ?? entry.id;
    const cancelled: string[] = [];
    if (entry.series_id && entry.date) {
      const future = await db.execute(
        `SELECT e.id AS id, e.notification_id AS nid FROM entries e JOIN pages p ON p.id = e.page_id
         WHERE e.series_id = ? AND p.date > ? AND e.is_completed = 0`,
        [sid, entry.date],
      );
      for (const f of future) {
        if (f.nid) cancelled.push(String(f.nid));
        await db.execute('DELETE FROM entries WHERE id = ?', [String(f.id)]);
      }
    }
    if (rule) {
      await db.execute('UPDATE entries SET series_id = ? WHERE id = ?', [sid, entryId]);
      await db.execute('UPDATE entries SET repeat = ? WHERE series_id = ?', [rule, sid]);
    } else if (entry.series_id) {
      await db.execute('UPDATE entries SET repeat = NULL WHERE series_id = ?', [sid]);
    }
    return cancelled;
  }

  // --- Ayarlar ----------------------------------------------------------------

  async function getSetting(key: string): Promise<string | null> {
    const rows = await db.execute('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0] ? String(rows[0].value) : null;
  }

  async function setSetting(key: string, value: string) {
    await db.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }

  // --- Yedek, geri yükleme, arama -----------------------------------------------

  /** Tarihli tüm notlar (yedek ve arama için), tarihe göre */
  async function listAllEntries(notebookId: string): Promise<EntryWithDate[]> {
    const rows = await db.execute(
      `${ENTRY_SELECT} WHERE p.notebook_id = ? AND p.date IS NOT NULL ORDER BY p.date, e.time_slot IS NULL, e.time_slot, e.created_at`,
      [notebookId],
    );
    return rows.map(toEntry);
  }

  /** Yedekten notları ekler; kimliği zaten var olanlar atlanır. Eklenen notların kimliklerini döner. */
  async function importEntries(
    notebookId: string,
    list: {
      id: string;
      date: ISODate;
      time: string | null;
      text: string;
      done: boolean;
      color: string | null;
      reminder: number | null;
      repeat: string | null;
      series: string | null;
      created: number;
    }[],
  ): Promise<string[]> {
    const added: string[] = [];
    for (const e of list) {
      if (await getEntry(e.id)) continue;
      const page = await getOrCreatePage(notebookId, e.date);
      await db.execute(
        `INSERT INTO entries (id, page_id, time_slot, text_content, is_completed, is_inbox, created_at, color, reminder_minutes, repeat, series_id)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [e.id, page.id, e.time, e.text, e.done ? 1 : 0, e.created, e.color, e.reminder, e.repeat, e.series],
      );
      added.push(e.id);
    }
    return added;
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
    listEntriesBetween,
    countEntriesByDate,
    listInbox,
    moveEntryToDate,
    moveEntryToInbox,
    toggleEntry,
    updateEntry,
    setEntryColor,
    setEntryReminder,
    setNotificationId,
    getEntry,
    listEntriesWithReminder,
    listSeriesTails,
    changeSeries,
    getSetting,
    setSetting,
    listAllEntries,
    importEntries,
    deleteEntry,
  };
}

export type Repository = ReturnType<typeof createRepository>;
