// Uygulama durumu: veri tabanı, seçili gün ve not işlemleri.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { SqlDriver } from '../db/driver';
import { migrate } from '../db/migrate';
import { createRepository, type EntryWithDate, type Repository } from '../db/repository';
import { todayISO, type ISODate } from '../services/calendar';
import { haptics } from '../services/haptics';
import { parseNote } from '../services/notes';

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
  addNote: (text: string, color?: string | null) => Promise<void>;
  setNoteColor: (id: string, color: string | null) => Promise<void>;
  updateNote: (id: string, text: string) => Promise<void>;
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrate(driver);
      const nb = await repo.ensureDefaultNotebook();
      if (cancelled) return;
      setNotebookId(nb.id);
      setReady(true);
    })().catch((e) => console.error('Veri tabanı başlatılamadı', e));
    return () => {
      cancelled = true;
    };
  }, [driver, repo]);

  // Gün veya içerik değişince o günün notları yeniden okunur
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

  const addNote = useCallback(
    async (input: string, color?: string | null) => {
      if (!notebookId) return;
      const { text, time } = parseNote(input);
      if (!text) return;
      await repo.createEntry(notebookId, { text, time, color, date: dateRef.current });
      haptics.tap();
      bump();
    },
    [repo, notebookId, bump],
  );

  const updateNote = useCallback(
    async (id: string, input: string) => {
      const { text, time } = parseNote(input);
      if (!text) return;
      await repo.updateEntry(id, text, time);
      bump();
    },
    [repo, bump],
  );

  const setNoteColor = useCallback(
    async (id: string, color: string | null) => {
      await repo.setEntryColor(id, color);
      haptics.select();
      bump();
    },
    [repo, bump],
  );

  const toggleNote = useCallback(
    async (id: string) => {
      await repo.toggleEntry(id);
      haptics.select();
      bump();
    },
    [repo, bump],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await repo.deleteEntry(id);
      haptics.tap();
      bump();
    },
    [repo, bump],
  );

  const value: AgendaState = {
    ready,
    repo,
    notebookId,
    date,
    notes,
    revision,
    selectDate,
    addNote,
    setNoteColor,
    updateNote,
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
