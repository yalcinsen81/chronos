// Uygulama durumu: veri tabanı, seçili gün ve onun haftası, haftanın notları ve not işlemleri.
// Alarmlı notlarda her değişiklikten sonra yerel bildirim yeniden kurulur (services/reminders).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { SqlDriver } from '../db/driver';
import { migrate } from '../db/migrate';
import { createRepository, type EntryWithDate, type Repository } from '../db/repository';
import { addDays, setClock12, setWeekStartsOnSunday, startOfWeek, todayISO, type ISODate } from '../services/calendar';
import {
  setAccentKey,
  setAppearance,
  setPureBlack,
  isAccentKey,
  type AccentKey,
  type Appearance,
} from '../constants/theme';
import { buildBackup, parseBackup } from '../services/backup';
import { parseTagNames, withTagName, type TagNames } from '../services/tagNames';
import {
  BACKUP_MIN_NOTES,
  isBackupDue,
  nextAfterBackup,
  nextAfterSnooze,
  parseRemindFrom,
} from '../services/backupNudge';
import { buildIcs, parseIcs } from '../services/ics';
import { haptics } from '../services/haptics';
import {
  cancelReminder,
  cancelSnooze,
  listenAlarmActions,
  requestReminderPermission,
  scheduleDailySummaries,
  scheduleReminder,
  snoozeReminder,
} from '../services/reminders';
import { materializeSeries } from '../services/series';
import { splitNote } from '../services/notes';
import { timeToMinutes } from '../services/dayLayout';

/** Son işlemi geri alan toast (silme, tamamlama, taşıma) */
export interface UndoAction {
  id: number;
  label: string;
  run: () => Promise<void>;
}

export type Density = 'rahat' | 'siki';

export interface NoteInput {
  /** Verilmezse yeni not oluşturulur */
  id?: string;
  /** Yeni notun günü; verilmezse seçili gün */
  date?: ISODate;
  /** İlk satır başlık, kalan satırlar açıklama */
  text: string;
  time: string | null;
  /** Bitiş saati (süre); saat yoksa yok sayılır */
  endTime?: string | null;
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
  /** Kullanıcının renklere verdiği adlar (yoksa varsayılan renk adı kullanılır) */
  tagNames: TagNames;
  setTagName: (key: string, name: string) => Promise<void>;
  /** Seçiliyse yalnızca bu renkteki notlar gösterilir */
  tagFilter: string | null;
  setTagFilter: (key: string | null) => void;
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
  /** Sürükle-bırak: günü ve/veya başlangıç saatini değiştirir (süre korunur) */
  reschedule: (id: string, to: { date?: ISODate; time?: string }) => Promise<void>;
  /** Birkaç notu birden taşır (geri alınabilir) */
  moveNotes: (ids: string[], date: ISODate) => Promise<void>;
  /** O günün tamamlanmamış notlarını bugüne aktarır */
  carryOver: (date: ISODate) => Promise<void>;
  /** Seçili vurgu rengi (ayarlardan) */
  accent: AccentKey;
  setAccent: (key: AccentKey) => Promise<void>;
  /** Geri alınabilir son işlem (birkaç saniye görünür) */
  undo: UndoAction | null;
  runUndo: () => Promise<void>;
  dismissUndo: () => void;
  /** Çoklu seçim: seçili not kimlikleri; boşsa seçim kipi kapalı */
  selection: string[];
  selecting: boolean;
  startSelect: (id: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  bulkComplete: () => Promise<void>;
  bulkMove: (target: ISODate) => Promise<void>;
  bulkDelete: () => Promise<void>;
  /** Hafta başlangıcı ('mon' | 'sun') ve saat gösterimi ('24' | '12') */
  weekStartsOn: 'mon' | 'sun';
  setWeekStartsOn: (v: 'mon' | 'sun') => Promise<void>;
  clock: '24' | '12';
  setClock: (v: '24' | '12') => Promise<void>;
  /** Görünüm: sistem / açık / koyu */
  appearance: Appearance;
  setAppearanceMode: (mode: Appearance) => Promise<void>;
  /** Koyu temada saf siyah zemin */
  pureBlack: boolean;
  setBlack: (on: boolean) => Promise<void>;
  /** Satır sıklığı (ayarlardan) */
  density: Density;
  setDensity: (d: Density) => Promise<void>;
  /** Günlük özet bildirim saati; null kapalı */
  summaryHour: number | null;
  setSummaryHour: (hour: number | null) => Promise<boolean>;
  /** Tüm notları yedek metni (JSON) olarak verir */
  exportBackup: () => Promise<string>;
  /** Takvim dosyası (.ics) */
  exportIcs: () => Promise<string>;
  importIcs: (text: string) => Promise<{ added: number } | { error: string }>;
  /** Her nota ayrı hedef gün verilir; tek bir "Geri al" ile hepsi eski yerine döner */
  moveEach: (moves: { id: string; to: ISODate }[]) => Promise<void>;
  /** İlk açılış karşılaması gösterildi mi */
  onboarded: boolean;
  finishOnboarding: () => Promise<void>;
  backupDue: boolean;
  markBackedUp: () => Promise<void>;
  snoozeBackup: () => Promise<void>;
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
  const [allWeekNotes, setWeekNotes] = useState<Record<ISODate, EntryWithDate[]>>({});
  const [tagNames, setTagNames] = useState<TagNames>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const weekNotes = useMemo(() => {
    if (!tagFilter) return allWeekNotes;
    const out: Record<ISODate, EntryWithDate[]> = {};
    for (const [d, list] of Object.entries(allWeekNotes)) out[d] = list.filter((n) => n.color === tagFilter);
    return out;
  }, [allWeekNotes, tagFilter]);
  const weekStart = startOfWeek(date);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<AgendaView>('week');
  const [accent, setAccentState] = useState<AccentKey>('turuncu');
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [pureBlack, setPureBlackState] = useState(false);
  const [appearance, setAppearanceState] = useState<Appearance>('system');
  const [weekStartsOn, setWeekStartsOnState] = useState<'mon' | 'sun'>('mon');
  const [clock, setClockState] = useState<'24' | '12'>('24');
  const [density, setDensityState] = useState<Density>('rahat');
  const [summaryHour, setSummaryHourState] = useState<number | null>(null);
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
      if ((await repo.getSetting('weekStart')) === 'sun') {
        setWeekStartsOnSunday(true);
        setWeekStartsOnState('sun');
      }
      if ((await repo.getSetting('clock')) === '12') {
        setClock12(true);
        setClockState('12');
      }
      const savedMode = await repo.getSetting('appearance');
      if (savedMode === 'light' || savedMode === 'dark') {
        setAppearance(savedMode);
        setAppearanceState(savedMode);
      }
      if ((await repo.getSetting('pureBlack')) === '1') {
        setPureBlack(true);
        setPureBlackState(true);
      }
      setTagNames(parseTagNames(await repo.getSetting('tagNames')));
      const savedDensity = await repo.getSetting('density');
      if (savedDensity === 'siki' || savedDensity === 'rahat') setDensityState(savedDensity);
      const rawSummary = await repo.getSetting('summaryHour');
      const savedSummary = rawSummary ? Number(rawSummary) : NaN;
      if (Number.isInteger(savedSummary) && savedSummary >= 0 && savedSummary <= 23) setSummaryHourState(savedSummary);
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
          endTime: input.endTime ?? null,
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
        if (input.endTime !== undefined || !input.time) {
          await repo.setEntryEndTime(id, input.time ? (input.endTime ?? null) : null);
        }
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

  const offerUndo = useCallback((label: string, run: () => Promise<void>) => {
    setUndo({ id: Date.now(), label, run });
  }, []);
  const dismissUndo = useCallback(() => setUndo(null), []);
  const runUndo = useCallback(async () => {
    const u = undo;
    setUndo(null);
    if (u) await u.run();
  }, [undo]);

  const flipNote = useCallback(
    async (id: string) => {
      await repo.toggleEntry(id);
      haptics.select();
      await syncReminder(id); // tamamlanan notun alarmı iptal edilir, geri alınınca yeniden kurulur
      bump();
    },
    [repo, bump, syncReminder],
  );

  const toggleNote = useCallback(
    async (id: string) => {
      const before = await repo.getEntry(id);
      await flipNote(id);
      if (before && !before.is_completed) offerUndo('Tamamlandı', () => flipNote(id));
    },
    [repo, flipNote, offerUndo],
  );

  /** Silinen notları (yedek biçimiyle) aynı kimlikle geri koyar */
  const restoreNotes = useCallback(
    async (list: EntryWithDate[]) => {
      if (!notebookId) return;
      await repo.importEntries(
        notebookId,
        list
          .filter((e) => e.date)
          .map((e) => ({
            id: e.id,
            date: e.date as ISODate,
            time: e.time_slot,
            end: e.end_time,
            text: e.text_content,
            done: e.is_completed,
            color: e.color,
            reminder: e.reminder_minutes,
            repeat: e.repeat,
            series: e.series_id,
            created: e.created_at,
          })),
      );
      for (const e of list) await syncReminder(e.id);
      bump();
    },
    [repo, notebookId, bump, syncReminder],
  );

  const removeNotes = useCallback(
    async (ids: string[]) => {
      const gone: EntryWithDate[] = [];
      for (const id of ids) {
        const entry = await repo.getEntry(id);
        if (!entry) continue;
        gone.push(entry);
        await cancelReminder(entry.notification_id);
        await cancelSnooze(id);
        await repo.deleteEntry(id);
      }
      haptics.tap();
      bump();
      if (gone.length)
        offerUndo(gone.length === 1 ? 'Not silindi' : `${gone.length} not silindi`, () => restoreNotes(gone));
    },
    [repo, bump, offerUndo, restoreNotes],
  );
  const deleteNote = useCallback((id: string) => removeNotes([id]), [removeNotes]);

  const relocate = useCallback(
    async (moves: { id: string; to: ISODate }[]) => {
      if (!notebookId) return;
      const back: { id: string; to: ISODate }[] = [];
      for (const m of moves) {
        const e = await repo.getEntry(m.id);
        if (e?.date) back.push({ id: m.id, to: e.date });
        await repo.moveEntryToDate(notebookId, m.id, m.to);
        await syncReminder(m.id);
      }
      haptics.tap();
      bump();
      return back;
    },
    [repo, notebookId, bump, syncReminder],
  );

  const moveNote = useCallback(
    async (id: string, target: ISODate) => {
      const back = await relocate([{ id, to: target }]);
      if (back?.length) offerUndo('Taşındı', async () => void (await relocate(back)));
    },
    [relocate, offerUndo],
  );

  const reschedule = useCallback(
    async (id: string, to: { date?: ISODate; time?: string }) => {
      const e = await repo.getEntry(id);
      if (!e) return;
      const prev = { date: e.date, time: e.time_slot, end: e.end_time };
      const apply = async (date: ISODate | null, time: string | null, end: string | null) => {
        await repo.updateEntry(id, e.text_content, time);
        await repo.setEntryEndTime(id, time ? end : null);
        if (date && date !== (await repo.getEntry(id))?.date && notebookId)
          await repo.moveEntryToDate(notebookId, id, date);
        await syncReminder(id);
        haptics.tap();
        bump();
      };
      let end = prev.end;
      if (to.time && prev.time && prev.end) {
        // Süre korunur: bitiş, başlangıçla aynı miktarda kayar (gün sonunu aşmaz)
        const shift = timeToMinutes(to.time) - timeToMinutes(prev.time);
        const m = timeToMinutes(prev.end) + shift;
        end = m < 24 * 60 ? `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` : null;
      }
      await apply(to.date ?? prev.date, to.time ?? prev.time, to.time ? end : prev.end);
      offerUndo('Taşındı', () => apply(prev.date, prev.time, prev.end));
    },
    [repo, notebookId, bump, syncReminder, offerUndo],
  );

  const moveNotes = useCallback(
    async (ids: string[], target: ISODate) => {
      const back = await relocate(ids.map((id) => ({ id, to: target })));
      if (back?.length) offerUndo(`${back.length} not taşındı`, async () => void (await relocate(back)));
    },
    [relocate, offerUndo],
  );

  // --- Çoklu seçim ---
  const startSelect = useCallback((id: string) => {
    haptics.select();
    setSelection([id]);
  }, []);
  const toggleSelect = useCallback((id: string) => {
    haptics.select();
    setSelection((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }, []);
  const clearSelection = useCallback(() => setSelection([]), []);
  const bulkComplete = useCallback(async () => {
    for (const id of selection) {
      const e = await repo.getEntry(id);
      if (e && !e.is_completed) await flipNote(id);
    }
    setSelection([]);
  }, [selection, repo, flipNote]);
  const bulkMove = useCallback(
    async (target: ISODate) => {
      const back = await relocate(selection.map((id) => ({ id, to: target })));
      setSelection([]);
      if (back?.length) offerUndo(`${back.length} not taşındı`, async () => void (await relocate(back)));
    },
    [selection, relocate, offerUndo],
  );
  const bulkDelete = useCallback(async () => {
    const ids = selection;
    setSelection([]);
    await removeNotes(ids);
  }, [selection, removeNotes]);

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

  const setWeekStartsOn = useCallback(
    async (v: 'mon' | 'sun') => {
      setWeekStartsOnSunday(v === 'sun');
      setWeekStartsOnState(v);
      await repo.setSetting('weekStart', v);
    },
    [repo],
  );
  const setTagName = useCallback(
    async (key: string, name: string) => {
      const next = withTagName(tagNames, key, name);
      setTagNames(next);
      await repo.setSetting('tagNames', JSON.stringify(next));
    },
    [repo, tagNames],
  );
  const setClock = useCallback(
    async (v: '24' | '12') => {
      setClock12(v === '12');
      setClockState(v);
      await repo.setSetting('clock', v);
    },
    [repo],
  );

  const setAppearanceMode = useCallback(
    async (mode: Appearance) => {
      setAppearance(mode);
      setAppearanceState(mode);
      haptics.select();
      await repo.setSetting('appearance', mode);
    },
    [repo],
  );

  const setBlack = useCallback(
    async (on: boolean) => {
      setPureBlack(on);
      setPureBlackState(on);
      haptics.select();
      await repo.setSetting('pureBlack', on ? '1' : '0');
    },
    [repo],
  );

  const setDensity = useCallback(
    async (d: Density) => {
      setDensityState(d);
      haptics.select();
      await repo.setSetting('density', d);
    },
    [repo],
  );

  /** Özeti açar/kapatır; açarken bildirim izni istenir. İzin yoksa false döner (özet yine de kaydedilir). */
  const setSummaryHour = useCallback(
    async (hour: number | null) => {
      setSummaryHourState(hour);
      haptics.select();
      await repo.setSetting('summaryHour', hour == null ? '' : String(hour));
      return hour == null ? true : requestReminderPermission();
    },
    [repo],
  );

  // Günlük özet: notlar her değiştiğinde önümüzdeki 7 günün sayıları güncellenir
  useEffect(() => {
    if (!notebookId || !ready) return;
    (async () => {
      const today = todayISO();
      const list = await repo.listEntriesBetween(notebookId, today, addDays(today, 6));
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i);
        const open = list.filter((e) => e.date === date && !e.is_completed);
        return {
          date,
          count: open.length,
          titles: open.map((e) => splitNote(e.text_content).title || e.text_content).slice(0, 3),
        };
      });
      await scheduleDailySummaries(summaryHour, days);
    })().catch((e) => console.warn('Günlük özet kurulamadı', e));
  }, [repo, notebookId, ready, revision, summaryHour]);

  const listAll = useCallback(async () => (notebookId ? repo.listAllEntries(notebookId) : []), [repo, notebookId]);

  const exportBackup = useCallback(async () => JSON.stringify(buildBackup(await listAll()), null, 1), [listAll]);

  const exportIcs = useCallback(async () => buildIcs(await listAll()), [listAll]);

  const importIcs = useCallback(
    async (text: string) => {
      if (!notebookId) return { error: 'Veri tabanı hazır değil.' };
      const events = parseIcs(text);
      if (!events.length) return { error: 'Dosyada etkinlik bulunamadı.' };
      const now = Date.now();
      const added = await repo.importEntries(
        notebookId,
        events.map((e, i) => ({
          id: e.id,
          date: e.date,
          time: e.time,
          end: e.endTime,
          text: e.text,
          done: false,
          color: null,
          reminder: null,
          repeat: null,
          series: null,
          created: now + i,
        })),
      );
      bump();
      return { added: added.length };
    },
    [repo, notebookId, bump],
  );

  const moveEach = useCallback(
    async (moves: { id: string; to: ISODate }[]) => {
      const back = await relocate(moves);
      if (back?.length) offerUndo(`${back.length} not taşındı`, async () => void (await relocate(back)));
    },
    [relocate, offerUndo],
  );

  const [onboarded, setOnboarded] = useState(true);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      if ((await repo.getSetting('onboarded')) === '1') return setOnboarded(true);
      // Notu olan (eski) kullanıcıya karşılama gösterilmez
      const any = notebookId ? (await repo.listAllEntries(notebookId)).length > 0 : false;
      if (any) {
        await repo.setSetting('onboarded', '1');
        return setOnboarded(true);
      }
      setOnboarded(false);
    })();
  }, [repo, ready, notebookId]);
  const finishOnboarding = useCallback(async () => {
    setOnboarded(true);
    await repo.setSetting('onboarded', '1');
  }, [repo]);

  // Haftalık yedek hatırlatması: ilk kez yeterli not birikince bugünden 7 gün sonrası kaydedilir
  const [backupDue, setBackupDue] = useState(false);
  useEffect(() => {
    if (!ready || !notebookId) return;
    (async () => {
      const count = (await repo.listAllEntries(notebookId)).length;
      if (count < BACKUP_MIN_NOTES) return;
      const today = todayISO();
      let from = parseRemindFrom(await repo.getSetting('backupRemind'));
      if (!from) {
        from = nextAfterBackup(today);
        await repo.setSetting('backupRemind', from);
      }
      setBackupDue(isBackupDue(from, today, count));
    })().catch((e) => console.warn('Yedek hatırlatması okunamadı', e));
  }, [repo, ready, notebookId]);
  const markBackedUp = useCallback(async () => {
    setBackupDue(false);
    await repo.setSetting('backupRemind', nextAfterBackup(todayISO()));
  }, [repo]);
  const snoozeBackup = useCallback(async () => {
    setBackupDue(false);
    await repo.setSetting('backupRemind', nextAfterSnooze(todayISO()));
  }, [repo]);

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
    tagNames,
    setTagName,
    tagFilter,
    setTagFilter,
    revision,
    accent,
    setAccent,
    appearance,
    setAppearanceMode,
    weekStartsOn,
    setWeekStartsOn,
    clock,
    setClock,
    pureBlack,
    setBlack,
    undo,
    runUndo,
    dismissUndo,
    selection,
    selecting: selection.length > 0,
    startSelect,
    toggleSelect,
    clearSelection,
    bulkComplete,
    bulkMove,
    bulkDelete,
    density,
    setDensity,
    summaryHour,
    setSummaryHour,
    exportBackup,
    importBackup,
    exportIcs,
    importIcs,
    moveEach,
    onboarded,
    finishOnboarding,
    backupDue,
    markBackedUp,
    snoozeBackup,
    listAll,
    view,
    menuNote,
    openMenu,
    closeMenu,
    selectDate,
    showDay,
    showWeek,
    moveNote,
    reschedule,
    moveNotes,
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
