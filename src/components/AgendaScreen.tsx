// Ana ekran: haftalık planlayıcı (WeekToDo düzeninden esinlenir).
// Geniş ekranda haftanın 7 günü yan yana sütunlar; telefonda günler yatay kaydırılan sayfalardır
// (bir sonraki günün kenarı görünür) ve üstteki gün şeridiyle atlanır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Space, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { addDays, todayISO, type ISODate } from '../services/calendar';
import { useGlobalShortcuts } from '../platform/shortcuts';
import { useAgenda } from '../state/AgendaContext';
import BackupNudge from './BackupNudge';
import DayColumn from './DayColumn';
import DayView from './DayView';
import OnboardingCard from './OnboardingCard';
import NoteSheet, { type NoteDraft } from './NoteSheet';
import PressScale from './PressScale';
import RowMenu from './RowMenu';
import SelectionBar from './SelectionBar';
import TagFilterBar from './TagFilterBar';
import UndoBar from './UndoBar';
import WeekHeader from './WeekHeader';

export default function AgendaScreen() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const { date, weekStart, weekDays, weekNotes, selectDate, view, menuNote, selecting, showDay, showWeek, runUndo } =
    useAgenda();
  useGlobalShortcuts({
    today: () => selectDate(todayISO()),
    prev: () => selectDate(addDays(date, -1)),
    next: () => selectDate(addDays(date, 1)),
    day: () => showDay(date),
    week: showWeek,
    undo: () => void runUndo(),
  });
  const [openNote, setOpenNote] = useState<EntryWithDate | null>(null);
  const [alarmFirst, setAlarmFirst] = useState(false);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTyping(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTyping(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  // Hafta değişince sütunlar değişim yönüne doğru kayarak gelir
  const prevWeek = useRef(weekStart);
  const dir = weekStart > prevWeek.current ? 1 : weekStart < prevWeek.current ? -1 : 0;
  useEffect(() => {
    prevWeek.current = weekStart;
  }, [weekStart]);
  const open = (n: EntryWithDate, alarm = false) => {
    setAlarmFirst(alarm);
    setOpenNote(n);
  };

  // Açık not, liste yenilenince en güncel haliyle gösterilir
  const current = openNote
    ? (Object.values(weekNotes)
        .flat()
        .find((n) => n.id === openNote.id) ?? openNote)
    : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WeekHeader showStrip={!wide || view === 'day'} onOpenNote={open} />
        <OnboardingCard />
        <BackupNudge />
        <TagFilterBar />
        {view === 'day' ? (
          // Hafta → gün: gün görünümü hafifçe büyüyerek belirir
          <Animated.View key="day" entering={FadeIn.duration(240)} style={styles.flex}>
            <Animated.View
              entering={ZoomIn.withInitialValues({ transform: [{ scale: 0.95 }] }).duration(260)}
              style={styles.flex}
            >
              <DayView
                date={date}
                notes={weekNotes[date] ?? []}
                onOpen={open}
                onNew={(d, t) => setDraft({ date: d, time: t })}
              />
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View
            key={`week-${weekStart}`}
            entering={(dir > 0 ? FadeInRight : dir < 0 ? FadeInLeft : FadeIn).duration(240)}
            style={styles.flex}
          >
            {wide ? (
              <WideWeek width={width} days={weekDays} notes={weekNotes} focus={date} onOpen={open} />
            ) : (
              <PhoneWeek
                width={width}
                days={weekDays}
                notes={weekNotes}
                focus={date}
                onFocus={selectDate}
                onOpen={open}
              />
            )}
          </Animated.View>
        )}
      </KeyboardAvoidingView>
      {!wide && !typing && !selecting && current === null && draft === null && (
        <Animated.View entering={ZoomIn.duration(220)} style={styles.fabWrap} pointerEvents="box-none">
          <PressScale
            haptic
            scale={0.9}
            onPress={() => setDraft({ date, time: null })}
            accessibilityRole="button"
            accessibilityLabel="Yeni not"
            style={[styles.fab, { backgroundColor: c.accent, shadowColor: c.accent }]}
          >
            <Ionicons name="add" size={30} color={c.onAccent} />
          </PressScale>
        </Animated.View>
      )}
      <UndoBar />
      <SelectionBar />
      <RowMenu onEdit={() => menuNote && open(menuNote)} />
      <NoteSheet
        note={current}
        draft={draft}
        alarm={alarmFirst}
        onClose={() => {
          setOpenNote(null);
          setDraft(null);
        }}
      />
    </SafeAreaView>
  );
}

interface WeekProps {
  width: number;
  days: ISODate[];
  notes: Record<ISODate, EntryWithDate[]>;
  focus: ISODate;
  onOpen: (n: EntryWithDate, alarm?: boolean) => void;
}

/** Geniş ekran: sütunlar yan yana; ekrana sığmazsa yatay kaydırılır, seçili gün görünür tutulur */
function WideWeek({ width, days, notes, focus, onOpen }: WeekProps) {
  const ref = useRef<ScrollView>(null);
  // Haftanın 7 günü de görünür; yalnızca dar tabletlerde (sütun 150 pikselin altına düşerse) yatay kaydırılır
  const avail = width - Space.lg * 2;
  const visible = Math.min(7, Math.max(4, Math.floor(avail / 150)));
  const colW = Math.floor(avail / visible);
  const idx = Math.max(0, days.indexOf(focus));

  useEffect(() => {
    const target = Math.max(0, Math.min(idx - 1, 7 - visible)) * colW;
    ref.current?.scrollTo({ x: target, animated: true });
  }, [idx, colW, visible]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      style={styles.flex}
      contentContainerStyle={styles.wideContent}
      showsHorizontalScrollIndicator={visible < 7}
      keyboardShouldPersistTaps="handled"
    >
      {days.map((d) => (
        <DayColumn key={d} date={d} notes={notes[d] ?? []} width={colW} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

/** Telefon: günler yatay sayfalar; kaydırınca seçili gün değişir, şeritten seçince sayfa kayar */
function PhoneWeek({ width, days, notes, focus, onFocus, onOpen }: WeekProps & { onFocus: (d: ISODate) => void }) {
  const ref = useRef<FlatList<ISODate>>(null);
  const pageW = Math.round(width * 0.88); // sonraki günün kenarı görünsün
  const idx = Math.max(0, days.indexOf(focus));
  const scrolling = useRef(false);

  useEffect(() => {
    if (scrolling.current) return;
    ref.current?.scrollToOffset({ offset: idx * pageW, animated: true });
  }, [idx, pageW, days]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrolling.current = false;
    const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
    const d = days[Math.max(0, Math.min(6, i))];
    if (d && d !== focus) onFocus(d);
  };

  return (
    <FlatList
      ref={ref}
      horizontal
      data={days}
      keyExtractor={(d) => d}
      renderItem={({ item }) => <DayColumn date={item} notes={notes[item] ?? []} width={pageW} onOpen={onOpen} />}
      getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
      initialScrollIndex={idx}
      snapToInterval={pageW}
      decelerationRate="fast"
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={() => (scrolling.current = true)}
      onMomentumScrollEnd={onEnd}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingRight: width - pageW }}
      style={styles.flex}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wideContent: { paddingHorizontal: Space.lg },
  fabWrap: { position: 'absolute', right: Space.lg, bottom: Space.xl },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
