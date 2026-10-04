// Ana ekran: haftalık planlayıcı (WeekToDo düzeninden esinlenir).
// Geniş ekranda haftanın 7 günü yan yana sütunlar; telefonda günler yatay kaydırılan sayfalardır
// (bir sonraki günün kenarı görünür) ve üstteki gün şeridiyle atlanır.

import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Space, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import type { ISODate } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import DayColumn from './DayColumn';
import NoteSheet from './NoteSheet';
import WeekHeader from './WeekHeader';

export default function AgendaScreen() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const { date, weekDays, weekNotes, selectDate } = useAgenda();
  const [openNote, setOpenNote] = useState<EntryWithDate | null>(null);

  // Açık not, liste yenilenince en güncel haliyle gösterilir
  const current = openNote ? (Object.values(weekNotes).flat().find((n) => n.id === openNote.id) ?? openNote) : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WeekHeader showStrip={!wide} />
        {wide ? (
          <WideWeek width={width} days={weekDays} notes={weekNotes} focus={date} onOpen={setOpenNote} />
        ) : (
          <PhoneWeek width={width} days={weekDays} notes={weekNotes} focus={date} onFocus={selectDate} onOpen={setOpenNote} />
        )}
      </KeyboardAvoidingView>
      <NoteSheet note={current} onClose={() => setOpenNote(null)} />
    </SafeAreaView>
  );
}

interface WeekProps {
  width: number;
  days: ISODate[];
  notes: Record<ISODate, EntryWithDate[]>;
  focus: ISODate;
  onOpen: (n: EntryWithDate) => void;
}

/** Geniş ekran: sütunlar yan yana; ekrana sığmazsa yatay kaydırılır, seçili gün görünür tutulur */
function WideWeek({ width, days, notes, focus, onOpen }: WeekProps) {
  const ref = useRef<ScrollView>(null);
  const visible = width >= 1500 ? 7 : width >= 1150 ? 5 : 4;
  const colW = Math.max(220, Math.floor((width - Space.lg * 2) / visible));
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
});
