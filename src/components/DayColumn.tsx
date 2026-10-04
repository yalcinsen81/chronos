// Tek gün sütunu (WeekToDo tarzı): üstte gün adı ve tarih, altında defter gibi çizgili satırlar.
// Her not bir satırdır; ilk boş satıra dokunup yazınca Enter ile not eklenir ve yeni satıra geçilir.
// Nota dokununca ayrıntı kartı (saat, alarm, renk, açıklama) açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { formatWeekday, fromISODate, todayISO, TR_MONTHS, type ISODate } from '../services/calendar';
import { parseNote, splitNote } from '../services/notes';
import { reminderLabel } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';
import Bell from './Bell';
import Checkbox from './Checkbox';
import { CelebrationLayer, useCelebrate } from './Confetti';
import EmptyDay from './EmptyDay';
import ProgressRing from './ProgressRing';
import { webNoOutline } from './webStyles';

export const LINE_HEIGHT = 46;
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
  const { saveNote, showDay, carryOver } = useAgenda();
  const burst = useCelebrate(notes.filter((n) => !n.is_completed).length, notes.length);
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
    const { text, time } = parseNote(value);
    await saveNote({ text, time, color: null, reminder: null, date });
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.column, { width }, isToday && { backgroundColor: c.accentSoft + '80' }]}>
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
                <View style={styles.progress}>
                  <Text style={[Type.caption, { color: c.textFaint }]}>
                    {open === 0 ? 'Hepsi bitti' : `${notes.length - open}/${notes.length}`}
                  </Text>
                  <ProgressRing
                    progress={(notes.length - open) / notes.length}
                    color={c.accent}
                    track={c.separator}
                    onColor={c.onAccent}
                  />
                </View>
              )
            )}
          </View>
        </View>
        <View style={[styles.headerRule, { backgroundColor: isToday ? c.accent : c.separator }]} />
      </View>

      <CelebrationLayer burst={burst} top={90} />
      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {notes.length === 0 && !draft && (
          <EmptyDay
            height={150}
            title={isPast ? 'Not yok' : 'Bu gün boş'}
            hint={isPast ? 'Bu güne not eklenmemiş.' : 'Aşağıdaki satıra dokun, yaz, Enter.'}
          />
        )}
        {notes.map((n) => (
          <TaskLine key={n.id} note={n} onOpen={(alarm) => onOpen(n, alarm)} />
        ))}

        <View style={[styles.line, { borderBottomColor: c.separator }]}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="+ Not ekle"
            placeholderTextColor={c.textFaint}
            style={[Type.sub, styles.input, webNoOutline, { color: c.text }]}
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
            style={[styles.line, { borderBottomColor: c.separator }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function TaskLine({ note, onOpen }: { note: EntryWithDate; onOpen: (alarm?: boolean) => void }) {
  const c = usePalette();
  const { toggleNote, openMenu } = useAgenda();
  const { title, body } = splitNote(note.text_content);
  const tint = tagColor(note.color, c);
  const done = note.is_completed;
  const alarm = note.reminder_minutes != null && !done;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.duration(180)}
    >
      <Pressable
        onPress={() => onOpen()}
        onLongPress={() => openMenu(note)}
        delayLongPress={380}
        style={({ pressed }) => [
          styles.line,
          styles.task,
          { borderBottomColor: c.separator },
          tint && { backgroundColor: tint + (c.scheme === 'dark' ? '2E' : '1F') },
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
        <Text
          numberOfLines={1}
          style={[Type.sub, styles.text, { color: done ? c.textFaint : c.text }, done && styles.struck]}
        >
          {title || body}
        </Text>
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
  headerRule: { height: 2, marginTop: Space.sm, borderRadius: 1 },
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
  bell: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
