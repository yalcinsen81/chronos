// Not bölümü başlığı (filtre sekmeleri) ve boş durum.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Space, usePalette } from '../constants/theme';

export type NoteFilter = 'all' | 'open' | 'done';

const FILTERS: { key: NoteFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'open', label: 'Yapılacak' },
  { key: 'done', label: 'Bitti' },
];

export function NotesHeader({
  filter,
  onFilter,
  counts,
}: {
  filter: NoteFilter;
  onFilter: (f: NoteFilter) => void;
  counts: Record<NoteFilter, number>;
}) {
  const c = usePalette();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: c.text }]}>Notlar</Text>
      <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => onFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segItem, active && [styles.segActive, { backgroundColor: c.surface, shadowColor: c.shadow }]]}
            >
              <Text style={[styles.segText, { color: active ? c.text : c.textMuted }]}>
                {f.label}
                {counts[f.key] > 0 && <Text style={{ color: active ? c.accent : c.textFaint }}> {counts[f.key]}</Text>}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function EmptyNotes({ filtered, onWrite }: { filtered: boolean; onWrite: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onWrite} style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={filtered ? 'filter-outline' : 'create-outline'} size={26} color={c.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>
        {filtered ? 'Bu filtrede not yok' : 'Bu gün için henüz not yok'}
      </Text>
      {!filtered && (
        <Text style={[styles.emptyHint, { color: c.textMuted }]}>
          Yukarıdaki alana yaz, "Ekle"ye dokun.
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md, flexWrap: 'wrap' },
  title: { fontFamily: Fonts.extrabold, fontSize: 22, letterSpacing: -0.5 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: Radius.pill },
  segItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  segActive: { shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontFamily: Fonts.semibold, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: Space.xl, gap: Space.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Space.xs },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 16 },
  emptyHint: { fontFamily: Fonts.regular, fontSize: 13, textAlign: 'center' },
});
