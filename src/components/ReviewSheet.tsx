// Haftalık gözden geçirme: görünen haftada ne bitti, ne kaldı; kalanlar tek dokunuşla gelecek haftaya (aynı güne) taşınır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { addDays, fromISODate, TR_MONTHS_SHORT, weekdayIndex, TR_WEEKDAYS_SHORT } from '../services/calendar';
import { splitNote } from '../services/notes';
import { useAgenda } from '../state/AgendaContext';
import Checkbox from './Checkbox';

export default function ReviewSheet({
  visible,
  onClose,
  onOpenNote,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenNote: (n: EntryWithDate) => void;
}) {
  const c = usePalette();
  const { weekDays, weekNotes, toggleNote, moveEach } = useAgenda();
  const all = weekDays.flatMap((d) => weekNotes[d] ?? []);
  const done = all.filter((n) => n.is_completed).length;
  const open = all.filter((n) => !n.is_completed);
  const first = fromISODate(weekDays[0]);
  const last = fromISODate(weekDays[6]);
  const range =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${TR_MONTHS_SHORT[last.getMonth()]}`
      : `${first.getDate()} ${TR_MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${TR_MONTHS_SHORT[last.getMonth()]}`;
  const ratio = all.length ? done / all.length : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={styles.head}>
            <Ionicons name="checkmark-done-outline" size={20} color={c.accent} />
            <View style={styles.flex}>
              <Text style={[Type.title, { color: c.text }]}>Haftayı gözden geçir</Text>
              <Text style={[Type.caption, { color: c.textMuted }]}>{range}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[Type.body, { color: c.text }]}>
              {all.length === 0 ? 'Bu haftaya not eklenmemiş.' : `${done}/${all.length} not tamamlandı.`}
            </Text>
            <View style={[styles.track, { backgroundColor: c.fill }]}>
              <View style={[styles.fill, { backgroundColor: c.accent, width: `${Math.round(ratio * 100)}%` }]} />
            </View>

            {open.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>AÇIK KALAN · {open.length}</Text>
                  <Pressable
                    onPress={() => {
                      void moveEach(open.map((n) => ({ id: n.id, to: addDays(n.date as string, 7) })));
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Hepsini gelecek haftaya taşı"
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: c.accentSoft },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[Type.caption, { color: c.accent }]}>Hepsini gelecek haftaya taşı</Text>
                  </Pressable>
                </View>
                {open.map((n) => {
                  const { title, body } = splitNote(n.text_content);
                  return (
                    <View key={n.id} style={[styles.row, { borderBottomColor: c.separator }]}>
                      <Checkbox
                        checked={false}
                        onPress={() => toggleNote(n.id)}
                        tint={tagColor(n.color, c)}
                        size={18}
                      />
                      <Pressable
                        style={styles.flex}
                        onPress={() => {
                          onClose();
                          onOpenNote(n);
                        }}
                        accessibilityRole="button"
                      >
                        <Text numberOfLines={1} style={[Type.sub, { color: c.text }]}>
                          {title || body}
                        </Text>
                        <Text style={[Type.caption, { color: c.textMuted }]}>
                          {TR_WEEKDAYS_SHORT[weekdayIndex(n.date as string)]}
                          {n.time_slot ? `  ·  ${n.time_slot}` : ''}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.lg, paddingBottom: Space.sm },
  body: { paddingHorizontal: Space.lg, paddingBottom: Space.lg, gap: Space.sm },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Space.md },
  section: { letterSpacing: 0.8 },
  chip: { paddingHorizontal: Space.sm, height: 28, borderRadius: Radius.pill, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 50,
    paddingVertical: Space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
