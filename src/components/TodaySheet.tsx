// Bugün listesi: geçen günlerden kalan tamamlanmamış notlar + bugünün notları tek yerde.
// Sabah planı için: geciken her nota "Bugüne" ya da "Yarına" denir, hepsi tek dokunuşla bugüne alınabilir.

import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { addDays, fromISODate, todayISO, TR_MONTHS_SHORT } from '../services/calendar';
import { splitNote } from '../services/notes';
import { useAgenda } from '../state/AgendaContext';
import Checkbox from './Checkbox';

const LOOKBACK_DAYS = 60;

export default function TodaySheet({
  visible,
  onClose,
  onOpenNote,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenNote: (n: EntryWithDate) => void;
}) {
  const c = usePalette();
  const { repo, notebookId, revision, toggleNote, moveNote, moveNotes } = useAgenda();
  const [list, setList] = useState<EntryWithDate[]>([]);
  const today = todayISO();

  useEffect(() => {
    if (!visible || !notebookId) return;
    let alive = true;
    repo.listEntriesBetween(notebookId, addDays(today, -LOOKBACK_DAYS), today).then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, [visible, notebookId, repo, revision, today]);

  const overdue = list.filter((n) => n.date && n.date < today && !n.is_completed);
  const now = list.filter((n) => n.date === today);
  const open = now.filter((n) => !n.is_completed).length;

  const row = (n: EntryWithDate, late: boolean) => {
    const { title, body } = splitNote(n.text_content);
    const d = n.date ? fromISODate(n.date) : null;
    return (
      <View key={n.id} style={[styles.row, { borderBottomColor: c.separator }]}>
        <Checkbox checked={n.is_completed} onPress={() => toggleNote(n.id)} tint={tagColor(n.color, c)} size={18} />
        <Pressable
          style={styles.text}
          onPress={() => {
            onClose();
            onOpenNote(n);
          }}
          accessibilityRole="button"
        >
          <Text
            numberOfLines={1}
            style={[Type.sub, { color: n.is_completed ? c.textFaint : c.text }, n.is_completed && styles.struck]}
          >
            {title || body}
          </Text>
          <Text style={[Type.caption, { color: c.textMuted }]}>
            {late && d ? `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]}` : ''}
            {late && n.time_slot ? '  ·  ' : ''}
            {n.time_slot ?? ''}
          </Text>
        </Pressable>
        {late && (
          <View style={styles.moves}>
            <Chip label="Bugüne" onPress={() => moveNote(n.id, today)} />
            <Chip label="Yarına" onPress={() => moveNote(n.id, addDays(today, 1))} />
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={styles.head}>
            <Ionicons name="today-outline" size={20} color={c.accent} />
            <View style={styles.flex}>
              <Text style={[Type.title, { color: c.text }]}>Bugün</Text>
              <Text style={[Type.caption, { color: c.textMuted }]}>
                {open === 0 && overdue.length === 0 ? 'Açık not yok' : `${open} açık not bugün`}
                {overdue.length > 0 ? `, ${overdue.length} geciken` : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {overdue.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>GECİKEN · {overdue.length}</Text>
                  <Chip
                    label="Hepsini bugüne al"
                    onPress={() =>
                      moveNotes(
                        overdue.map((n) => n.id),
                        today,
                      )
                    }
                  />
                </View>
                <Text style={[Type.caption, styles.hint, { color: c.textMuted }]}>
                  Kaçını bugün yapacaksın? Her nota "Bugüne" ya da "Yarına" de.
                </Text>
                {overdue.map((n) => row(n, true))}
              </>
            )}
            <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>BUGÜN · {now.length}</Text>
            {now.length === 0 ? (
              <Text style={[Type.sub, styles.hint, { color: c.textMuted }]}>Bugün için not yok.</Text>
            ) : (
              now.map((n) => row(n, false))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.6 }]}
    >
      <Text style={[Type.caption, { color: c.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.lg, paddingBottom: Space.sm },
  body: { paddingHorizontal: Space.lg, paddingBottom: Space.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Space.md },
  section: { marginTop: Space.md, letterSpacing: 0.8 },
  hint: { paddingVertical: Space.xs, fontWeight: '400' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 50,
    paddingVertical: Space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: 'line-through' },
  moves: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: Space.sm, height: 28, borderRadius: Radius.pill, justifyContent: 'center' },
});
