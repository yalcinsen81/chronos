// Uygulama durumu: veri tabanı bağlantısı, aktif defter, hiyerarşik navigasyon ve kalem ayarları.
// Navigasyon defter metaforuna uygun olarak yığın değil, seviye + tarih ikilisidir:
//   Yıl → Ay → Günlük iki sayfalık yayılım.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_PEN, InkColors } from '../constants/theme';
import type { SqlDriver } from '../db/driver';
import { migrate } from '../db/migrate';
import { createRepository, type EntryWithDate, type Repository } from '../db/repository';
import { todayISO, type ISODate } from '../services/calendar';
import { haptics } from '../services/haptics';
import type { Notebook } from '../types/models';

export type ViewLevel = 'year' | 'month' | 'day';

export interface NewEntryInput {
  text: string;
  date?: ISODate | null;
  time?: string | null;
  audioPath?: string | null;
}

interface AgendaState {
  ready: boolean;
  repo: Repository;
  notebook: Notebook | null;
  level: ViewLevel;
  date: ISODate; // seçili gün (ay/yıl görünümünde de bağlamı korur)
  inbox: EntryWithDate[];
  /** Herhangi bir giriş değiştiğinde artar; görünümler buna göre yeniden sorgular */
  revision: number;
  /** Az önce yazılan girişler: mürekkep animasyonu yalnızca bunlarda oynar */
  freshIds: Set<string>;
  penColor: string;
  penSize: number;
  goTo: (level: ViewLevel, date?: ISODate) => void;
  addEntry: (input: NewEntryInput) => Promise<EntryWithDate | null>;
  moveEntry: (entryId: string, date: ISODate, time?: string | null) => Promise<void>;
  moveToInbox: (entryId: string) => Promise<void>;
  toggleEntry: (entryId: string) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  setPen: (color: string, size?: number) => void;
}

const AgendaContext = createContext<AgendaState | null>(null);

export function AgendaProvider({ driver, children }: { driver: SqlDriver; children: ReactNode }) {
  const repo = useMemo(() => createRepository(driver), [driver]);
  const [ready, setReady] = useState(false);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [level, setLevel] = useState<ViewLevel>('day');
  const [date, setDate] = useState<ISODate>(todayISO());
  const [inbox, setInbox] = useState<EntryWithDate[]>([]);
  const [revision, setRevision] = useState(0);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [penColor, setPenColor] = useState<string>(InkColors.midnight);
  const [penSize, setPenSize] = useState<number>(DEFAULT_PEN.size);
  const notebookRef = useRef<Notebook | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrate(driver);
      const nb = await repo.ensureDefaultNotebook();
      const items = await repo.listInbox();
      if (cancelled) return;
      notebookRef.current = nb;
      setNotebook(nb);
      setInbox(items);
      setReady(true);
    })().catch((e) => console.error('Veri tabanı başlatılamadı', e));
    return () => {
      cancelled = true;
    };
  }, [driver, repo]);

  const bump = useCallback(async () => {
    setInbox(await repo.listInbox());
    setRevision((r) => r + 1);
  }, [repo]);

  const goTo = useCallback((next: ViewLevel, nextDate?: ISODate) => {
    setLevel(next);
    if (nextDate) setDate(nextDate);
  }, []);

  const markFresh = useCallback((id: string) => {
    setFreshIds((prev) => new Set(prev).add(id));
    // Animasyon bir kez oynadıktan sonra işaret kaldırılır
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 4000);
  }, []);

  const addEntry = useCallback(
    async (input: NewEntryInput) => {
      const nb = notebookRef.current;
      if (!nb || !input.text.trim()) return null;
      const entry = await repo.createEntry(nb.id, input);
      markFresh(entry.id);
      await bump();
      haptics.success();
      return entry;
    },
    [repo, bump, markFresh],
  );

  const moveEntry = useCallback(
    async (entryId: string, target: ISODate, time?: string | null) => {
      const nb = notebookRef.current;
      if (!nb) return;
      await repo.moveEntryToDate(nb.id, entryId, target, time);
      markFresh(entryId);
      await bump();
      haptics.drop();
    },
    [repo, bump, markFresh],
  );

  const wrap = useCallback(
    (fn: (id: string) => Promise<void>) => async (id: string) => {
      await fn(id);
      await bump();
    },
    [bump],
  );

  const setPen = useCallback((color: string, size?: number) => {
    setPenColor(color);
    if (size !== undefined) setPenSize(size);
    haptics.toolChange();
  }, []);

  const value: AgendaState = {
    ready,
    repo,
    notebook,
    level,
    date,
    inbox,
    revision,
    freshIds,
    penColor,
    penSize,
    goTo,
    addEntry,
    moveEntry,
    moveToInbox: wrap(repo.moveEntryToInbox),
    toggleEntry: wrap(repo.toggleEntry),
    deleteEntry: wrap(repo.deleteEntry),
    setPen,
  };

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): AgendaState {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda, AgendaProvider içinde kullanılmalı');
  return ctx;
}
