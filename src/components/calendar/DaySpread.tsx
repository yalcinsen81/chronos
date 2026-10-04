// Günlük İki Sayfalık Yayılım:
//   Sol sayfa  → saat çizgili plan (07:00–22:00). Girişler kendi saat çizgisine el yazısıyla yazılır.
//   Sağ sayfa  → serbest not/çizim sayfası (mürekkep motoru, vuruşlar SQLite'a kaydedilir).
// Tablette iki sayfa yan yana, telefonda sekmeyle tek sayfa gösterilir.
// Sayfa kenarlarından çekilerek 3D sayfa çevirme ile önceki/sonraki güne geçilir.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';

import { HANDWRITING_FONT, InkColors, LINE_HEIGHT, MARGIN_LEFT } from '../../constants/theme';
import type { EntryWithDate, StoredStroke } from '../../db/repository';
import {
  addDays,
  diffDays,
  formatWeekday,
  fromISODate,
  getTimeSlots,
  isoWeekNumber,
  slotForTime,
  todayISO,
  TR_MONTHS,
} from '../../services/calendar';
import { useAgenda } from '../../state/AgendaContext';
import type { Page, PageType } from '../../types/models';
import NotebookPage from '../canvas/NotebookPage';
import { PaperBackground } from '../canvas/PaperBackground';
import { DropZone, Draggable } from '../dnd/DragContext';
import HandwrittenEntry from '../entry/HandwrittenEntry';
import PageCurl, { type PageCurlHandle } from '../notebook/PageCurl';
import PenToolbar from '../notebook/PenToolbar';
import RibbonBookmark from '../notebook/RibbonBookmark';

const SLOTS = getTimeSlots(7, 22);
const SLOT_H = LINE_HEIGHT * 2;
const HEADER_H = 96;

export default function DaySpread() {
  const { date, goTo, repo, notebook, revision } = useAgenda();
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const [side, setSide] = useState<'plan' | 'notes'>('plan');
  const curl = useRef<PageCurlHandle>(null);
  const dateRef = useRef(date);
  dateRef.current = date;

  // Sayfa çevirme tarihi değiştirir; ref kullanılır çünkü iptal geri çağrısı sonradan gelir
  const onNavigate = useCallback((delta: number) => goTo('day', addDays(dateRef.current, delta)), [goTo]);

  const today = todayISO();
  const goToday = () => curl.current?.turn(diffDays(date, today));

  return (
    <View style={styles.container}>
      {!wide && (
        <View style={styles.segment}>
          {(['plan', 'notes'] as const).map((s) => (
            <Pressable key={s} onPress={() => setSide(s)} style={[styles.segBtn, side === s && styles.segActive]}>
              <Text style={[styles.segText, side === s && styles.segTextActive]}>{s === 'plan' ? 'Plan' : 'Notlar'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <PageCurl ref={curl} onNavigate={onNavigate}>
        <View style={[styles.spread, !wide && styles.single]}>
          {(wide || side === 'plan') && <PlanPage key={`plan-${date}`} date={date} notebookId={notebook?.id} revision={revision} repo={repo} />}
          {wide && <View style={styles.spine} />}
          {(wide || side === 'notes') && notebook && <NotesPage key={`notes-${date}`} date={date} notebookId={notebook.id} repo={repo} />}
        </View>
      </PageCurl>

      <View style={styles.ribbon} pointerEvents="box-none">
        <RibbonBookmark onPress={goToday} label="Bugüne dön" />
      </View>

      <View style={styles.navRow} pointerEvents="box-none">
        <Pressable onPress={() => curl.current?.turn(-1)} hitSlop={10} style={styles.navBtn}>
          <Text style={styles.navText}>‹ {fromISODate(addDays(date, -1)).getDate()}</Text>
        </Pressable>
        <Pressable onPress={() => curl.current?.turn(1)} hitSlop={10} style={styles.navBtn}>
          <Text style={styles.navText}>{fromISODate(addDays(date, 1)).getDate()} ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sol sayfa: saatli plan
// ---------------------------------------------------------------------------

function PlanPage({
  date,
  notebookId,
  revision,
  repo,
}: {
  date: string;
  notebookId?: string;
  revision: number;
  repo: ReturnType<typeof useAgenda>['repo'];
}) {
  const { freshIds, toggleEntry, goTo } = useAgenda();
  const [entries, setEntries] = useState<EntryWithDate[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!notebookId) return;
    let alive = true;
    repo.listEntriesForDate(notebookId, date).then((list) => alive && setEntries(list));
    return () => {
      alive = false;
    };
  }, [repo, notebookId, date, revision]);

  const bySlot = useMemo(() => {
    const map = new Map<string, EntryWithDate[]>();
    for (const e of entries) {
      const key = e.time_slot ? slotForTime(e.time_slot) : 'allday';
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [entries]);

  const d = fromISODate(date);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p.width === width && p.height === height ? p : { width, height }));
  };

  const renderEntry = (e: EntryWithDate) => (
    <Draggable key={e.id} entry={e}>
      <View style={styles.entryWrap}>
        {e.time_slot && e.time_slot.slice(3) !== '00' && <Text style={styles.minute}>{e.time_slot}</Text>}
        <HandwrittenEntry entry={e} inkColor={InkColors.midnight} fresh={freshIds.has(e.id)} onToggle={() => toggleEntry(e.id)} />
      </View>
    </Draggable>
  );

  return (
    <View style={styles.page} onLayout={onLayout}>
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <PaperBackground width={size.width} height={size.height} pageType="blank" />
        </Canvas>
      )}
      <View style={styles.header}>
        <Text style={styles.bigDay}>{d.getDate()}</Text>
        <View>
          <Text style={styles.weekday}>{formatWeekday(date)}</Text>
          <Pressable onPress={() => goTo('month', date)}>
            <Text style={styles.monthLine}>
              {TR_MONTHS[d.getMonth()]} {d.getFullYear()} · {isoWeekNumber(date)}. hafta
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.slots}>
        <DropZone date={date} time={null} style={styles.allDay}>
          <Text style={styles.slotLabel}>Gün boyu</Text>
          <View style={styles.slotEntries}>{(bySlot.get('allday') ?? []).map(renderEntry)}</View>
        </DropZone>
        {SLOTS.map((slot) => (
          <DropZone key={slot} date={date} time={slot} style={styles.slot}>
            <Text style={styles.slotLabel}>{slot}</Text>
            <View style={styles.slotEntries}>{(bySlot.get(slot) ?? []).map(renderEntry)}</View>
          </DropZone>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sağ sayfa: serbest çizim
// ---------------------------------------------------------------------------

function NotesPage({ date, notebookId, repo }: { date: string; notebookId: string; repo: ReturnType<typeof useAgenda>['repo'] }) {
  const { penColor, penSize } = useAgenda();
  const [page, setPage] = useState<Page | null>(null);
  const [strokes, setStrokes] = useState<StoredStroke[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Boş günler için sayfa yalnızca ilk vuruşta oluşturulur; burada varsa okunur
      const existing = await repo.findPage(notebookId, date);
      if (!alive) return;
      setPage(existing);
      setStrokes(existing ? await repo.listStrokes(existing.id) : []);
    })();
    return () => {
      alive = false;
    };
  }, [repo, notebookId, date]);

  const ensurePage = useCallback(async () => {
    if (page) return page;
    const p = await repo.getOrCreatePage(notebookId, date);
    setPage(p);
    return p;
  }, [page, repo, notebookId, date]);

  const onAddStroke = useCallback(
    async (s: Omit<StoredStroke, 'id'>) => {
      const tempId = `tmp-${Date.now()}`;
      setStrokes((prev) => [...prev, { ...s, id: tempId }]); // iyimser güncelleme
      const p = await ensurePage();
      const saved = await repo.addStroke(p.id, s);
      setStrokes((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
    },
    [ensurePage, repo],
  );

  const onUndo = useCallback(async () => {
    const last = strokes[strokes.length - 1];
    if (!last) return;
    setStrokes((prev) => prev.slice(0, -1));
    if (!last.id.startsWith('tmp-')) await repo.deleteStroke(last.id);
  }, [strokes, repo]);

  const onPageType = useCallback(
    async (t: PageType) => {
      const p = await ensurePage();
      await repo.setPageType(p.id, t);
      setPage({ ...p, page_type: t });
    },
    [ensurePage, repo],
  );

  const pageType = page?.page_type ?? 'dot';

  return (
    <View style={styles.page}>
      <NotebookPage
        strokes={strokes}
        onAddStroke={onAddStroke}
        pageType={pageType}
        paperStyle={page?.background_style ?? 'ivory'}
        inkColor={penColor}
        penSize={penSize}
        topInset={HEADER_H}
      >
        <Text style={styles.notesTitle}>Notlar</Text>
      </NotebookPage>
      <View style={styles.toolbar} pointerEvents="box-none">
        <PenToolbar onUndo={onUndo} canUndo={strokes.length > 0} pageType={pageType} onPageType={onPageType} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segment: { flexDirection: 'row', alignSelf: 'center', marginVertical: 6, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.06)' },
  segBtn: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 99 },
  segActive: { backgroundColor: InkColors.midnight },
  segText: { color: '#3A3220', fontSize: 14 },
  segTextActive: { color: '#FFF' },
  spread: {
    flex: 1,
    flexDirection: 'row',
    margin: 10,
    marginBottom: 0,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  single: { margin: 6 },
  spine: { width: 14, backgroundColor: '#E2D8C2', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  page: { flex: 1 },
  header: { height: HEADER_H, flexDirection: 'row', alignItems: 'center', paddingLeft: MARGIN_LEFT - 30, gap: 12 },
  bigDay: { fontFamily: HANDWRITING_FONT, fontSize: 64, color: InkColors.midnight, lineHeight: 72 },
  weekday: { fontFamily: HANDWRITING_FONT, fontSize: 28, color: InkColors.red },
  monthLine: { fontSize: 12, color: '#7A6F5A' },
  slots: { paddingBottom: 140 },
  allDay: { minHeight: SLOT_H, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,90,140,0.25)' },
  slot: { minHeight: SLOT_H, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,90,140,0.25)' },
  slotLabel: { width: MARGIN_LEFT, paddingTop: 6, paddingLeft: 8, fontSize: 12, color: '#9A6A5A', borderRightWidth: 1, borderColor: 'rgba(190,60,60,0.35)' },
  slotEntries: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, gap: 2 },
  entryWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  minute: { fontSize: 11, color: '#7A6F5A' },
  notesTitle: { fontFamily: HANDWRITING_FONT, fontSize: 28, color: '#9A8F78', marginTop: 34, marginLeft: 20 },
  toolbar: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  ribbon: { position: 'absolute', top: 0, right: 64 },
  navRow: { position: 'absolute', top: 18, right: 96, flexDirection: 'row', gap: 14 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  navText: { fontFamily: HANDWRITING_FONT, fontSize: 18, color: '#9A8F78' },
});
