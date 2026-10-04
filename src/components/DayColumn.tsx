// Tek gün sütunu (WeekToDo tarzı): üstte gün adı ve tarih, altında defter gibi çizgili satırlar.
// Her not bir satırdır; ilk boş satıra dokunup yazınca Enter ile not eklenir ve yeni satıra geçilir.
// Nota dokununca ayrıntı kartı (saat, alarm, renk, açıklama) açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { formatWeekday, fromISODate, todayISO, TR_MONTHS, type ISODate } from '../services/calendar';
import { parseNote, splitNote } from '../services/notes';
import { reminderLabel } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';
import Checkbox from './Checkbox';
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
  onOpen: (note: EntryWithDate) => void;
}) {
  const c = usePalette();
  const { saveNote } = useAgenda();
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
    <View style={[styles.column, { width }]}>
      <View style={styles.header}>
        <Text style={[Type.title, { color: isToday ? c.accent : isPast ? c.textMuted : c.text }]}>{formatWeekday(date)}</Text>
        <View style={styles.subRow}>
          <Text style={[Type.caption, { color: isToday ? c.accent : c.textMuted }]}>
            {d.getDate()} {TR_MONTHS[d.getMonth()]}
            {isToday ? '  ·  Bugün' : ''}
          </Text>
          {notes.length > 0 && (
            <Text style={[Type.caption, { color: c.textFaint }]}>
              {open === 0 ? 'Hepsi bitti' : `${open} açık`}
            </Text>
          )}
        </View>
        <View style={[styles.headerRule, { backgroundColor: isToday ? c.accent : c.text }]} />
      </View>

      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {notes.map((n) => (
          <TaskLine key={n.id} note={n} onOpen={() => onOpen(n)} />
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

function TaskLine({ note, onOpen }: { note: EntryWithDate; onOpen: () => void }) {
  const c = usePalette();
  const { toggleNote } = useAgenda();
  const { title, body } = splitNote(note.text_content);
  const tint = tagColor(note.color, c);
  const done = note.is_completed;
  const alarm = note.reminder_minutes != null && !done;

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(180)}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.line,
          styles.task,
          { borderBottomColor: c.separator },
          tint && { backgroundColor: tint + (c.scheme === 'dark' ? '2E' : '1F') },
          pressed && { opacity: 0.6 },
        ]}
        accessibilityHint="Ayrıntılar için dokun"
      >
        <Checkbox checked={done} onPress={() => toggleNote(note.id)} tint={tint} size={18} />
        {note.time_slot && (
          <Text style={[Type.caption, styles.time, { color: done ? c.textFaint : tint ?? c.accent }]}>{note.time_slot}</Text>
        )}
        <Text
          numberOfLines={1}
          style={[Type.sub, styles.text, { color: done ? c.textFaint : c.text }, done && styles.struck]}
        >
          {title || body}
        </Text>
        {Boolean(title && body) && <Ionicons name="document-text-outline" size={14} color={c.textFaint} />}
        {alarm && (
          <Ionicons
            name="alarm"
            size={15}
            color={c.accent}
            accessibilityLabel={`Alarm ${reminderLabel(note.reminder_minutes)}`}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, paddingHorizontal: Space.md },
  header: { paddingTop: Space.lg, gap: 2 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
});
