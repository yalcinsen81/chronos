// Uygulama durumu: veri tabanı, seçili gün ve onun haftası, haftanın notları ve not işlemleri.
// Alarmlı notlarda her değişiklikten sonra yerel bildirim yeniden kurulur (services/reminders).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { SqlDriver } from '../db/driver';
import { migrate } from '../db/migrate';
import { createRepository, type EntryWithDate, type Repository } from '../db/repository';
import { addDays, startOfWeek, todayISO, type ISODate } from '../services/calendar';
import { setAccentKey, isAccentKey, type AccentKey } from '../constants/theme';
import { buildBackup, parseBackup } from '../services/backup';
import { haptics } from '../services/haptics';
import {
  cancelReminder,
  cancelSnooze,
  listenAlarmActions,
  scheduleReminder,
  snoozeReminder,
} from '../services/reminders';
import { materializeSeries } from '../services/series';

export interface NoteInput {
  /** Verilmezse yeni not oluşturulur */
  id?: string;
  /** Yeni notun günü; verilmezse seçili gün */
  date?: ISODate;
  /** İlk satır başlık, kalan satırlar açıklama */
  text: string;
  time: string | null;
  color: string | null;
  /** Saatten kaç dakika önce alarm; null = alarm yok */
  reminder: number | null;
  /** Tekrar kuralı (services/recurrence.ts); null = tekrar yok; verilmezse mevcut notun tekrarı değişmez */
  repeat?: string | null;
}

export type AgendaView = 'week' | 'day';

/** Tekrarlayan notlar en az bu kadar gün ilerisine kadar üretilir (gezilen hafta daha ilerideyse o haftaya kadar) */
const SERIES_HORIZON_DAYS = 30;

interface AgendaState {
  ready: boolean;
  repo: Repository;
  notebookId: string | null;
  /** Seçili gün */
  date: ISODate;
  /** Seçili günün haftası (Pazartesi) */
  weekStart: ISODate;
  /** Haftanın 7 günü */
  weekDays: ISODate[];
  /** Haftadaki notlar, güne göre (saatliler önce, saate göre sıralı) */
  weekNotes: Record<ISODate, EntryWithDate[]>;
  /** Herhangi bir not değiştiğinde artar; takvim noktaları buna göre yenilenir */
  revision: number;
  /** Haftalık ya da günlük görünüm */
  view: AgendaView;
  /** Uzun basılan not (eylem menüsü) */
  menuNote: EntryWithDate | null;
  openMenu: (note: EntryWithDate) => void;
  closeMenu: () => void;
  selectDate: (date: ISODate) => void;
  /** Günü seçip gün görünümüne geçer */
  showDay: (date: ISODate) => void;
  showWeek: () => void;
  /** Notu başka güne taşır (alarmı yeni güne göre yeniden kurulur) */
  moveNote: (id: string, date: ISODate) => Promise<void>;
  /** O günün tamamlanmamış notlarını bugüne aktarır */
  carryOver: (date: ISODate) => Promise<void>;
  /** Seçili vurgu rengi (ayarlardan) */
  accent: AccentKey;
  setAccent: (key: AccentKey) => Promise<void>;
  /** Tüm notları yedek metni (JSON) olarak verir */
  exportBackup: () => Promise<string>;
  /** Yedek metnini içe aktarır; var olan notlara dokunmaz. Eklenen not sayısını ya da hata iletisini döner. */
  importBackup: (json: string) => Promise<{ added: number } | { error: string }>;
  /** Tüm notlar (arama için) */
  listAll: () => Promise<EntryWithDate[]>;
  saveNote: (input: NoteInput) => Promise<void>;
  toggleNote: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const AgendaContext = createContext<AgendaState | null>(null);

export function AgendaProvider({ driver, children }: { driver: SqlDriver; children: ReactNode }) {
  const repo = useMemo(() => createRepository(driver), [driver]);
  const [ready, setReady] = useState(false);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [date, setDate] = useState<ISODate>(todayISO());
  const [weekNotes, setWeekNotes] = useState<Record<ISODate, EntryWithDate[]>>({});
  const weekStart = startOfWeek(date);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<AgendaView>('week');
  const [accent, setAccentState] = useState<AccentKey>('turuncu');
  const [menuNote, setMenuNote] = useState<EntryWithDate | null>(null);
  const openMenu = useCallback((n: EntryWithDate) => {
    haptics.tap();
    setMenuNote(n);
  }, []);
  const closeMenu = useCallback(() => setMenuNote(null), []);
  const seriesLock = useRef<Promise<void>>(Promise.resolve());
  const dateRef = useRef(date);
  dateRef.current = date;

  /** Notun alarmını veri tabanındaki son haline göre yeniden kurar */
  const syncReminder = useCallback(
    async (id: string) => {
      const entry = await repo.getEntry(id);
      if (!entry) return;
      if (entry.reminder_minutes == null && !entry.notification_id) return;
      const nid = await scheduleReminder(entry).catch((e) => {
        console.warn('Alarm kurulamadı', e);
        return null;
      });
      if (nid !== entry.notification_id) await repo.setNotificationId(id, nid);
    },
    [repo],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrate(driver);
      const nb = await repo.ensureDefaultNotebook();
      if (cancelled) return;
      const savedAccent = await repo.getSetting('accent');
      if (isAccentKey(savedAccent)) {
        setAccentKey(savedAccent);
        setAccentState(savedAccent);
      }
      if (cancelled) return;
      setNotebookId(nb.id);
      setReady(true);
      // Açılışta alarmlar yeniden kurulur (izin sonradan verildiyse ya da cihaz yeniden kurulduysa)
      for (const e of await repo.listEntriesWithReminder()) await syncReminder(e.id);
    })().catch((e) => console.error('Veri tabanı başlatılamadı', e));
    return () => {
      cancelled = true;
    };
  }, [driver, repo, syncReminder]);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      // Tekrarlayan notların eksik tekrarları üretilir (görünen haftaya ya da 30 gün ileriye kadar)
      const horizon = addDays(todayISO(), SERIES_HORIZON_DAYS);
      const until = weekDays[6] > horizon ? weekDays[6] : horizon;
      // Üst üste gelen yüklemeler aynı tekrarı iki kez üretmesin diye sıraya girer
      const run = seriesLock.current.then(() => materializeSeries(repo, notebookId, until));
      seriesLock.current = run.then(
        () => undefined,
        () => undefined,
      );
      for (const id of await run) await syncReminder(id);
      const list = await repo.listEntriesBetween(notebookId, weekDays[0], weekDays[6]);
      if (cancelled) return;
      const byDay: Record<ISODate, EntryWithDate[]> = {};
      for (const e of list) (byDay[e.date as ISODate] ??= []).push(e);
      setWeekNotes(byDay);
    })().catch((e) => console.error('Notlar yüklenemedi', e));
    return () => {
      cancelled = true;
    };
  }, [repo, notebookId, weekDays, revision, syncReminder]);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const selectDate = useCallback((next: ISODate) => {
    if (next === dateRef.current) return;
    haptics.select();
    setDate(next);
  }, []);

  const showDay = useCallback(
    (next: ISODate) => {
      selectDate(next);
      setView('day');
    },
    [selectDate],
  );
  const showWeek = useCallback(() => setView('week'), []);

  const saveNote = useCallback(
    async (input: NoteInput) => {
      const text = input.text.trim();
      if (!notebookId || !text) return;
      let id = input.id;
      if (!id) {
        const e = await repo.createEntry(notebookId, {
          text,
          time: input.time,
          color: input.color,
          reminderMinutes: input.reminder,
          repeat: input.repeat ?? null,
          date: input.date ?? dateRef.current,
        });
        id = e.id;
        haptics.tap();
      } else {
        await repo.updateEntry(id, text, input.time);
        await repo.setEntryColor(id, input.color);
        await repo.setEntryReminder(id, input.reminder);
        if (input.repeat !== undefined) {
          const before = await repo.getEntry(id);
          if (before && before.repeat !== input.repeat) {
            // Sonraki tekrarlar silinir; yeni kurala göre yeniden üretilir (load efekti)
            for (const nid of await repo.changeSeries(id, input.repeat)) await cancelReminder(nid);
          }
        }
      }
      await syncReminder(id);
      bump();
    },
    [repo, notebookId, bump, syncReminder],
  );

  const toggleNote = useCallback(
    async (id: string) => {
      await repo.toggleEntry(id);
      haptics.select();
      await syncReminder(id); // tamamlanan notun alarmı iptal edilir, geri alınınca yeniden kurulur
      bump();
    },
    [repo, bump, syncReminder],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const entry = await repo.getEntry(id);
      await cancelReminder(entry?.notification_id ?? null);
      await cancelSnooze(id);
      await repo.deleteEntry(id);
      haptics.tap();
      bump();
    },
    [repo, bump],
  );

  const moveNote = useCallback(
    async (id: string, target: ISODate) => {
      if (!notebookId) return;
      await repo.moveEntryToDate(notebookId, id, target);
      haptics.tap();
      await syncReminder(id);
      bump();
    },
    [repo, notebookId, bump, syncReminder],
  );

  const carryOver = useCallback(
    async (from: ISODate) => {
      if (!notebookId) return;
      const today = todayISO();
      for (const n of await repo.listEntriesForDate(notebookId, from)) {
        if (n.is_completed) continue;
        await repo.moveEntryToDate(notebookId, n.id, today);
        await syncReminder(n.id);
      }
      haptics.tap();
      bump();
    },
    [repo, notebookId, bump, syncReminder],
  );

  const setAccent = useCallback(
    async (key: AccentKey) => {
      setAccentKey(key);
      setAccentState(key);
      haptics.select();
      await repo.setSetting('accent', key);
    },
    [repo],
  );

  const listAll = useCallback(async () => (notebookId ? repo.listAllEntries(notebookId) : []), [repo, notebookId]);

  const exportBackup = useCallback(async () => JSON.stringify(buildBackup(await listAll()), null, 1), [listAll]);

  const importBackup = useCallback(
    async (json: string) => {
      if (!notebookId) return { error: 'Veri tabanı hazır değil.' };
      const parsed = parseBackup(json);
      if (!parsed.ok) return { error: parsed.error };
      const added = await repo.importEntries(notebookId, parsed.entries);
      for (const id of added) await syncReminder(id);
      bump();
      return { added: added.length };
    },
    [repo, notebookId, bump, syncReminder],
  );

  // Bildirime dokunma ve bildirimdeki "ertele" / "tamamla" düğmeleri
  useEffect(() => {
    if (!ready) return;
    return listenAlarmActions(async (a) => {
      const entry = await repo.getEntry(a.entryId);
      if (!entry) return;
      if (a.action === 'snooze') {
        await snoozeReminder(entry);
      } else if (a.action === 'done') {
        if (!entry.is_completed) {
          await repo.toggleEntry(entry.id);
          await syncReminder(entry.id);
          bump();
        }
      } else if (entry.date) {
        setDate(entry.date);
        setView('day');
      }
    });
  }, [ready, repo, bump, syncReminder]);

  const value: AgendaState = {
    ready,
    repo,
    notebookId,
    date,
    weekStart,
    weekDays,
    weekNotes,
    revision,
    accent,
    setAccent,
    exportBackup,
    importBackup,
    listAll,
    view,
    menuNote,
    openMenu,
    closeMenu,
    selectDate,
    showDay,
    showWeek,
    moveNote,
    carryOver,
    saveNote,
    toggleNote,
    deleteNote,
  };

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): AgendaState {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda, AgendaProvider içinde kullanılmalı');
  return ctx;
}
