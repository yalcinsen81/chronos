// Tek gün sütunu (WeekToDo tarzı): üstte gün adı ve tarih, altında defter gibi çizgili satırlar.
// Her not bir satırdır; ilk boş satıra dokunup yazınca Enter ile not eklenir ve yeni satıra geçilir.
// Nota dokununca ayrıntı kartı (saat, alarm, renk, açıklama) açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { formatWeekday, fromISODate, todayISO, TR_MONTHS, type ISODate } from '../services/calendar';
import { checklistProgress } from '../services/checklist';
import { parseSmart } from '../services/naturalDate';
import { splitNote } from '../services/notes';
import { reminderLabel } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';
import Bell from './Bell';
import Checkbox from './Checkbox';
import EmptyDay from './EmptyDay';
import { webNoOutline } from './webStyles';

export const LINE_HEIGHT = 46;
const COMPACT_LINE_HEIGHT = 38;
/** Ayarlardaki satır sıklığına göre satır yüksekliği */
export const lineHeightFor = (density: 'rahat' | 'siki') => (density === 'siki' ? COMPACT_LINE_HEIGHT : LINE_HEIGHT);
const MIN_LINES = 12; // sütun boşken de defter sayfası gibi çizgili görünsün

export default function DayColumn({
  date,
  notes,
  width,
  onOpen,
}: {
  date: ISODate;
  notes: EntryWithDate[];
  width: number;
  onOpen: (note: EntryWithDate, alarm?: boolean) => void;
}) {
  const c = usePalette();
  const { saveNote, showDay, carryOver, selectDate, density } = useAgenda();
  const lh = lineHeightFor(density);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const today = todayISO();
  const isToday = date === today;
  const isPast = date < today;
  const d = fromISODate(date);
  const open = notes.filter((n) => !n.is_completed).length;
  const fillers = Math.max(0, MIN_LINES - notes.length - 1);

  const add = async () => {
    const value = draft.trim();
    if (!value) return;
    setDraft('');
    // "yarın 15:00 diş hekimi" gibi yazılanlar gün ve saati kendisi bulur
    const { text, time, endTime, date: when } = parseSmart(value);
    await saveNote({ text, time, endTime, color: null, reminder: null, date: when ?? date });
    if (when && when !== date) selectDate(when);
    else inputRef.current?.focus();
  };

  return (
    <View style={[styles.column, { width }, isToday && { backgroundColor: c.accentSoft + '55' }]}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Pressable
            onPress={() => showDay(date)}
            accessibilityRole="button"
            accessibilityLabel={`${formatWeekday(date)} gününü aç`}
            style={({ pressed }) => [styles.headLeft, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.titleRow}>
              <Text style={[Type.micro, styles.weekday, { color: isToday ? c.accent : c.textMuted }]}>
                {formatWeekday(date).toLocaleUpperCase('tr-TR')}
              </Text>
              <Ionicons name="expand-outline" size={12} color={c.textFaint} />
            </View>
            <View style={styles.numRow}>
              <View style={[styles.num, isToday && { backgroundColor: c.accent }]}>
                <Text style={[Type.dayNumber, { color: isToday ? c.onAccent : isPast ? c.textMuted : c.text }]}>
                  {d.getDate()}
                </Text>
              </View>
              <Text style={[Type.caption, { color: isToday ? c.accent : c.textMuted }]}>
                {TR_MONTHS[d.getMonth()]}
                {isToday ? '  ·  Bugün' : ''}
              </Text>
            </View>
          </Pressable>
          <View style={styles.headRight}>
            {isPast && open > 0 ? (
              <Pressable
                onPress={() => carryOver(date)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${formatWeekday(date)} günündeki ${open} açık notu bugüne taşı`}
                style={[styles.carry, { backgroundColor: c.accentSoft }]}
              >
                <Ionicons name="arrow-redo-outline" size={12} color={c.accent} />
                <Text style={[Type.caption, { color: c.accent }]}>{open} açık · bugüne taşı</Text>
              </Pressable>
            ) : (
              notes.length > 0 && (
                <Text style={[Type.caption, { color: c.textFaint }]}>
                  {open === 0 ? 'Hepsi bitti' : `${notes.length - open}/${notes.length}`}
                </Text>
              )
            )}
          </View>
        </View>
        {/* İnce çizgi günün doluluğunu gösterir: 8 açık notta tamamen dolar */}
        <View style={[styles.headerRule, { backgroundColor: isToday ? c.accentSoft : c.separator }]}>
          <View
            style={[
              styles.headerFill,
              { backgroundColor: isToday ? c.accent : c.textFaint, width: `${Math.min(1, open / 8) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {notes.length === 0 && !draft && (
          <EmptyDay
            height={150}
            title={isPast ? 'Not yok' : 'Bu gün boş'}
            hint={isPast ? 'Bu güne not eklenmemiş.' : 'Aşağıdaki satıra dokun, yaz, Enter.'}
          />
        )}
        {sortOpenFirst(notes).map((n, i) => (
          <TaskLine key={n.id} note={n} index={i} onOpen={(alarm) => onOpen(n, alarm)} />
        ))}

        <View style={[styles.line, { borderBottomColor: c.separator, height: lh }]}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="+ Not ekle"
            placeholderTextColor={c.textFaint}
            style={[Type.sub, styles.input, webNoOutline, { color: c.text, height: lh }]}
            accessibilityLabel={`${formatWeekday(date)} için not ekle`}
          />
          {draft.trim().length > 0 && (
            <Pressable onPress={add} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ekle">
              <Ionicons name="arrow-up-circle" size={24} color={c.accent} />
            </Pressable>
          )}
        </View>

        {Array.from({ length: fillers }).map((_, i) => (
          <Pressable
            key={i}
            onPress={() => inputRef.current?.focus()}
            style={[styles.line, { borderBottomColor: c.separator, height: lh }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** Tamamlananlar listenin sonuna iner (kararlı sıralama: saat sırası korunur) */
export function sortOpenFirst(notes: EntryWithDate[]): EntryWithDate[] {
  return [...notes].sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
}

/** Tamamlanınca çizgi soldan sağa çekilir, yazı soluklaşır */
export function StrikeText({
  text,
  done,
  style,
  color,
  lineColor,
}: {
  text: string;
  done: boolean;
  style: object | object[];
  color: string;
  lineColor: string;
}) {
  const [w, setW] = useState(0);
  const p = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(done ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [done, p]);
  const line = useAnimatedStyle(() => ({ width: w * p.value }));
  const fade = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * p.value }));
  return (
    <View style={styles.strikeWrap}>
      <Animated.Text
        numberOfLines={1}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={[style, styles.strikeText, { color }, fade]}
      >
        {text}
      </Animated.Text>
      <Animated.View pointerEvents="none" style={[styles.strikeLine, { backgroundColor: lineColor }, line]} />
    </View>
  );
}

export function TaskLine({
  note,
  onOpen,
  index = 0,
}: {
  note: EntryWithDate;
  onOpen: (alarm?: boolean) => void;
  index?: number; // sıra: satırlar sırayla (kademeli) belirir
}) {
  const c = usePalette();
  const { toggleNote, openMenu, density, selection, toggleSelect, selecting } = useAgenda();
  const selected = selection.includes(note.id);
  const { title, body } = splitNote(note.text_content);
  const tint = tagColor(note.color, c);
  const done = note.is_completed;
  const alarm = note.reminder_minutes != null && !done;
  const sub = checklistProgress(body);
  // Tamamlanınca satır hafifçe küçülüp yaylanarak yerine döner
  const pop = useSharedValue(1);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (done) {
      pop.value = 0.97;
      pop.value = withSpring(1, { damping: 8, stiffness: 220 });
    }
  }, [done, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40)
        .springify()
        .damping(18)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.springify().damping(20)}
    >
      <Animated.View style={popStyle}>
        <Pressable
          onPress={() => (selecting ? toggleSelect(note.id) : onOpen())}
          onLongPress={() => (selecting ? toggleSelect(note.id) : openMenu(note))}
          delayLongPress={380}
          style={({ pressed }) => [
            styles.line,
            styles.task,
            { borderBottomColor: c.separator, height: lineHeightFor(density) },
            tint && { backgroundColor: tint + (c.scheme === 'dark' ? '2E' : '1F') },
            selected && { backgroundColor: c.accentSoft, borderColor: c.accent, borderWidth: 1.5 },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityHint="Ayrıntılar için dokun, menü için uzun bas"
        >
          <Checkbox checked={done} onPress={() => toggleNote(note.id)} tint={tint} size={18} />
          {note.time_slot && (
            <Text style={[Type.caption, styles.time, { color: done ? c.textFaint : (tint ?? c.accent) }]}>
              {note.time_slot}
            </Text>
          )}
          <StrikeText text={title || body} done={done} style={Type.sub} color={c.text} lineColor={c.textFaint} />
          {sub.total > 0 && (
            <Text
              style={[Type.micro, { color: c.textFaint }]}
              accessibilityLabel={`${sub.done} / ${sub.total} alt görev`}
            >
              {sub.done}/{sub.total}
            </Text>
          )}
          {Boolean(title && body) && <Ionicons name="document-text-outline" size={14} color={c.textFaint} />}
          {note.repeat && <Ionicons name="repeat" size={14} color={c.textFaint} accessibilityLabel="Tekrarlanıyor" />}
          {/* Saati olan notta zil her zaman görünür: tek dokunuşla alarm kurulur */}
          {!done && (alarm || note.time_slot) && (
            <Pressable
              onPress={() => onOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={alarm ? `Alarm ${reminderLabel(note.reminder_minutes)}` : 'Alarm kur'}
              style={[styles.bell, alarm && { backgroundColor: c.accentSoft }]}
            >
              <Bell active={alarm} color={alarm ? c.accent : c.textFaint} />
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, paddingHorizontal: Space.md, borderRadius: Radius.lg },
  header: { paddingTop: Space.md },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 54 },
  headLeft: { gap: 2 },
  headRight: { paddingBottom: 6 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekday: { letterSpacing: 1.2 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  num: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  carry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Space.sm,
    height: 22,
    borderRadius: Radius.pill,
  },
  headerRule: { height: 2, marginTop: Space.sm, borderRadius: 1, overflow: 'hidden' },
  headerFill: { height: 2, borderRadius: 1 },
  line: {
    height: LINE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  task: { paddingHorizontal: 6, borderRadius: 4 },
  input: { flex: 1, height: LINE_HEIGHT, paddingHorizontal: 6 },
  time: { fontVariant: ['tabular-nums'], fontWeight: '700' },
  text: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: 'line-through' },
  strikeText: { alignSelf: 'flex-start', maxWidth: '100%' },
  strikeWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  strikeLine: { position: 'absolute', left: 0, top: '52%', height: 1.5, borderRadius: 1 },
  bell: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
