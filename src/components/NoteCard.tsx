// Tek not kartı: renk şeridi, tamamlandı kutusu, saat etiketi, dokunarak düzenleme, renk ve silme.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { cardShadow, Fonts, NOTE_TAG_KEYS, Radius, Space, tagColor, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { useAgenda } from '../state/AgendaContext';

/** Düzenleme alanına geri yazarken saat başa eklenir: "14:30 Diş hekimi" */
const toDraft = (n: EntryWithDate) => (n.time_slot ? `${n.time_slot} ${n.text_content}` : n.text_content);

export default function NoteCard({
  note,
  editing,
  onEdit,
  onEndEdit,
}: {
  note: EntryWithDate;
  editing: boolean;
  onEdit: () => void;
  onEndEdit: () => void;
}) {
  const c = usePalette();
  const { toggleNote, updateNote, deleteNote, setNoteColor } = useAgenda();
  const [draft, setDraft] = useState(toDraft(note));
  const tint = tagColor(note.color, c);

  useEffect(() => {
    if (editing) setDraft(toDraft(note));
  }, [editing, note]);

  const commit = async () => {
    const value = draft.trim();
    if (value && value !== toDraft(note)) await updateNote(note.id, value);
    onEndEdit();
  };

  const cycleColor = () => {
    const i = NOTE_TAG_KEYS.indexOf((note.color ?? 'indigo') as (typeof NOTE_TAG_KEYS)[number]);
    setNoteColor(note.id, NOTE_TAG_KEYS[(i + 1) % NOTE_TAG_KEYS.length]);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.duration(220)}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, cardShadow(c)]}
    >
      <View style={[styles.stripe, { backgroundColor: tint }]} />

      <Pressable
        onPress={() => toggleNote(note.id)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: note.is_completed }}
        style={[
          styles.check,
          { borderColor: note.is_completed ? tint : c.textFaint },
          note.is_completed && { backgroundColor: tint },
        ]}
      >
        {note.is_completed && <Ionicons name="checkmark" size={15} color={c.surface} />}
      </Pressable>

      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          submitBehavior="blurAndSubmit"
          style={[styles.input, { color: c.text, borderColor: c.accent }]}
        />
      ) : (
        <Pressable onPress={onEdit} style={styles.body} accessibilityHint="Düzenlemek için dokun">
          <Text
            style={[
              styles.text,
              { color: note.is_completed ? c.textFaint : c.text },
              note.is_completed && styles.struck,
            ]}
          >
            {note.text_content}
          </Text>
          {note.time_slot && (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={13} color={c.textMuted} />
              <Text style={[styles.time, { color: c.textMuted }]}>{note.time_slot}</Text>
            </View>
          )}
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={cycleColor}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Rengi değiştir"
          style={styles.action}
        >
          <View style={[styles.swatch, { backgroundColor: tint }]} />
        </Pressable>
        <Pressable
          onPress={() => deleteNote(note.id)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Notu sil"
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: c.surfaceAlt }]}
        >
          <Ionicons name="trash-outline" size={17} color={c.textFaint} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingLeft: Space.lg + 2,
    paddingRight: Space.sm,
    minHeight: 60,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: Space.md, gap: 3 },
  text: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21 },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontFamily: Fonts.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    paddingVertical: Space.sm,
    marginVertical: Space.sm,
    borderBottomWidth: 1.5,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 12, height: 12, borderRadius: 6 },
});
