// Arama: notların içinde ara (Türkçe harf ve büyük/küçük harf duyarsız) ve renk etiketine göre süz.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NOTE_TAG_KEYS, NoteTags, Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { formatClock, formatWeekday, fromISODate, TR_MONTHS } from '../services/calendar';
import { splitNote } from '../services/notes';
import { searchNotes } from '../services/search';
import { tagLabel } from '../services/tagNames';
import { useAgenda } from '../state/AgendaContext';
import { webNoOutline } from './webStyles';

export default function SearchSheet({
  visible,
  onClose,
  onOpenNote,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenNote: (n: EntryWithDate) => void;
}) {
  const c = usePalette();
  const { listAll, selectDate, tagNames } = useAgenda();
  const [all, setAll] = useState<EntryWithDate[]>([]);
  const [q, setQ] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listAll().then((l) => alive && setAll(l));
    return () => {
      alive = false;
    };
  }, [visible, listAll]);

  const results = useMemo(() => searchNotes(all, q, color), [all, q, color]);

  const pick = (n: EntryWithDate) => {
    onClose();
    if (n.date) selectDate(n.date);
    onOpenNote(n);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={[styles.field, { backgroundColor: c.fill }]}>
            <Ionicons name="search" size={18} color={c.textMuted} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="Notlarda ara"
              placeholderTextColor={c.textFaint}
              returnKeyType="search"
              style={[Type.body, styles.input, webNoOutline, { color: c.text }]}
              accessibilityLabel="Notlarda ara"
            />
            {q !== '' && (
              <Pressable
                onPress={() => setQ('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
              >
                <Ionicons name="close-circle" size={18} color={c.textFaint} />
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Text style={[Type.sub, { color: c.accent }]}>Kapat</Text>
            </Pressable>
          </View>

          <View style={styles.tags}>
            <Text style={[Type.caption, { color: c.textMuted }]}>
              {color ? tagLabel(tagNames, color, NoteTags[color as keyof typeof NoteTags]?.label ?? 'Renk') : 'Renk'}
            </Text>
            {NOTE_TAG_KEYS.map((k) => {
              const active = color === k;
              const col = tagColor(k, c)!;
              return (
                <Pressable
                  key={k}
                  onPress={() => setColor(active ? null : k)}
                  hitSlop={3}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${tagLabel(tagNames, k, NoteTags[k].label)} renkli notlar`}
                  style={[styles.ring, active && { borderColor: col }]}
                >
                  <View style={[styles.dot, { backgroundColor: col }]} />
                </Pressable>
              );
            })}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
            {q.trim() === '' && !color ? (
              <Text style={[Type.sub, styles.hint, { color: c.textMuted }]}>Aramak için yaz ya da bir renk seç.</Text>
            ) : results.length === 0 ? (
              <Text style={[Type.sub, styles.hint, { color: c.textMuted }]}>Sonuç yok.</Text>
            ) : (
              results.map((n, i) => {
                const { title, body } = splitNote(n.text_content);
                const d = n.date ? fromISODate(n.date) : null;
                return (
                  <Animated.View key={n.id} entering={FadeInDown.duration(180).delay(Math.min(i, 8) * 30)}>
                    <Pressable
                      onPress={() => pick(n)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.row,
                        { borderBottomColor: c.separator },
                        pressed && { backgroundColor: c.fill },
                      ]}
                    >
                      <View style={[styles.stripe, { backgroundColor: tagColor(n.color, c) ?? c.separator }]} />
                      <View style={styles.flex}>
                        <Text
                          numberOfLines={1}
                          style={[
                            Type.sub,
                            { color: n.is_completed ? c.textFaint : c.text },
                            n.is_completed && styles.struck,
                          ]}
                        >
                          {title || body}
                        </Text>
                        <Text style={[Type.caption, { color: c.textMuted }]}>
                          {n.date ? `${formatWeekday(n.date)}, ${d!.getDate()} ${TR_MONTHS[d!.getMonth()]}` : ''}
                          {n.time_slot ? `  ·  ${formatClock(n.time_slot)}` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  backdrop: { flex: 1, alignItems: 'center', paddingTop: 72, paddingHorizontal: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '75%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.md,
    gap: Space.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    height: 44,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
  },
  input: { flex: 1, height: 44 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Space.xs },
  ring: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  list: { flexGrow: 0 },
  hint: { paddingVertical: Space.lg, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stripe: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  struck: { textDecorationLine: 'line-through' },
});
