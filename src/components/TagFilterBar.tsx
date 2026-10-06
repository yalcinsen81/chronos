// Etiket süzgeci: haftada renkli not varsa, renk adlarıyla bir şerit çıkar; birine dokununca yalnızca o renk görünür.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NOTE_TAG_KEYS, NoteTags, Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import { tagLabel } from '../services/tagNames';
import { useAgenda } from '../state/AgendaContext';

export default function TagFilterBar() {
  const c = usePalette();
  const { weekNotes, tagNames, tagFilter, setTagFilter } = useAgenda();
  const used = Object.values(weekNotes).some((list) => list.some((n) => n.color));
  if (!used && !tagFilter) return null;
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {NOTE_TAG_KEYS.map((k) => {
          const active = tagFilter === k;
          const col = tagColor(k, c)!;
          const name = tagLabel(tagNames, k, NoteTags[k].label);
          return (
            <Pressable
              key={k}
              onPress={() => setTagFilter(active ? null : k)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${name} süzgeci`}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: active ? c.accentSoft : c.fill, borderColor: active ? col : 'transparent' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: col }]} />
              <Text style={[Type.caption, { color: active ? c.text : c.textMuted }]}>{name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Space.sm },
  row: { paddingHorizontal: Space.lg, gap: Space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
