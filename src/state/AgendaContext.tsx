// Uygulama durumu: veri tabanı, seçili gün, o günün notları ve not işlemleri.
// Alarmlı notlarda her değişiklikten sonra yerel bildirim yeniden kurulur (services/reminders).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { SqlDriver } from '../db/driver';
import { migrate } from '../db/migrate';
import { createRepository, type EntryWithDate, type Repository } from '../db/repository';
import { todayISO, type ISODate } from '../services/calendar';
import { haptics } from '../services/haptics';
import { cancelReminder, scheduleReminder } from '../services/reminders';

export interface NoteInput {
  /** Verilmezse yeni not seçili güne eklenir */
  id?: string;
  /** İlk satır başlık, kalan satırlar açıklama */
  text: string;
  time: string | null;
  color: string | null;
  /** Saatten kaç dakika önce alarm; null = alarm yok */
  reminder: number | null;
}

interface AgendaState {
  ready: boolean;
  repo: Repository;
  notebookId: string | null;
  /** Seçili gün */
  date: ISODate;
  /** Seçili günün notları (saatliler önce, saate göre sıralı) */
  notes: EntryWithDate[];
  /** Herhangi bir not değiştiğinde artar; takvim noktaları buna göre yenilenir */
  revision: number;
  selectDate: (date: ISODate) => void;
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
  const [notes, setNotes] = useState<EntryWithDate[]>([]);
  const [revision, setRevision] = useState(0);
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
    repo.listEntriesForDate(notebookId, date).then((list) => {
      if (!cancelled) setNotes(list);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, notebookId, date, revision]);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const selectDate = useCallback((next: ISODate) => {
    if (next === dateRef.current) return;
    haptics.select();
    setDate(next);
  }, []);

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
          date: dateRef.current,
        });
        id = e.id;
        haptics.tap();
      } else {
        await repo.updateEntry(id, text, input.time);
        await repo.setEntryColor(id, input.color);
        await repo.setEntryReminder(id, input.reminder);
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
      await repo.deleteEntry(id);
      haptics.tap();
      bump();
    },
    [repo, bump],
  );

  const value: AgendaState = { ready, repo, notebookId, date, notes, revision, selectDate, saveNote, toggleNote, deleteNote };

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): AgendaState {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda, AgendaProvider içinde kullanılmalı');
  return ctx;
}
