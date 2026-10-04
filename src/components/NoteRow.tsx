// Kapalı not satırı (Things'in yapılacak satırı gibi): kutucuk, başlık, altta gri saat / etiket / açıklama.
// Satıra dokununca yerinde düzenleyiciye (NoteEditor) açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { splitNote } from '../services/notes';
import { reminderLabel } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';

export function Checkbox({ checked, onPress, tint }: { checked: boolean; onPress?: () => void; tint?: string | null }) {
  const c = usePalette();
  const color = tint ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.box, { borderColor: checked ? color : c.check }, checked && { backgroundColor: color }]}
    >
      {checked && <Ionicons name="checkmark" size={14} color={c.onAccent} />}
    </Pressable>
  );
}

export default function NoteRow({ note, onOpen }: { note: EntryWithDate; onOpen: () => void }) {
  const c = usePalette();
  const { toggleNote } = useAgenda();
  const { title, body } = splitNote(note.text_content);
  const tint = tagColor(note.color, c);
  const done = note.is_completed;
  const alarm = note.reminder_minutes != null && !done;
  const hasMeta = Boolean(note.time_slot || tint || body || alarm);

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} layout={LinearTransition.duration(200)}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.fill }]}
        accessibilityHint="Açmak için dokun"
      >
        <View style={styles.checkWrap}>
          <Checkbox checked={done} onPress={() => toggleNote(note.id)} tint={tint} />
        </View>
        <View style={styles.texts}>
          <Text style={[Type.body, { color: done ? c.textMuted : c.text }]} numberOfLines={2}>
            {title || body}
          </Text>
          {hasMeta && (
            <View style={styles.meta}>
              {note.time_slot && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={c.textMuted} />
                  <Text style={[Type.caption, { color: c.textMuted, fontVariant: ['tabular-nums'] }]}>{note.time_slot}</Text>
                </View>
              )}
              {alarm && (
                <View style={styles.metaItem} accessibilityLabel={`Alarm ${reminderLabel(note.reminder_minutes)}`}>
                  <Ionicons name="alarm" size={13} color={c.accent} />
                  {note.reminder_minutes !== 0 && (
                    <Text style={[Type.caption, { color: c.accent }]}>{reminderLabel(note.reminder_minutes, true)}</Text>
                  )}
                </View>
              )}
              {tint && <View style={[styles.tag, { backgroundColor: tint }]} />}
              {Boolean(title && body) && (
                <View style={[styles.metaItem, styles.bodyPreview]}>
                  <Ionicons name="document-text-outline" size={13} color={c.textFaint} />
                  <Text style={[Type.caption, { color: c.textMuted, fontWeight: '400', flex: 1 }]} numberOfLines={1}>
                    {body.replace(/\n+/g, '  ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, paddingVertical: 10, paddingHorizontal: Space.sm, borderRadius: Radius.md },
  checkWrap: { paddingTop: 1 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3, minWidth: 0 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bodyPreview: { flex: 1, minWidth: 0 },
  tag: { width: 8, height: 8, borderRadius: 4 },
});
