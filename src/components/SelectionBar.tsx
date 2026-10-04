// Çoklu seçim çubuğu: seçili notları birlikte tamamla, taşı ya da sil.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { addDays, todayISO } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SelectionBar() {
  const c = usePalette();
  const { selection, selecting, clearSelection, bulkComplete, bulkMove, bulkDelete } = useAgenda();
  if (!selecting) return null;
  const today = todayISO();
  const actions: { icon: IconName; label: string; danger?: boolean; run: () => void }[] = [
    { icon: 'checkmark-circle-outline', label: 'Tamamla', run: () => void bulkComplete() },
    { icon: 'today-outline', label: 'Bugüne taşı', run: () => void bulkMove(today) },
    { icon: 'arrow-forward-circle-outline', label: 'Yarına taşı', run: () => void bulkMove(addDays(today, 1)) },
    { icon: 'trash-outline', label: 'Sil', danger: true, run: () => void bulkDelete() },
  ];
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      style={[styles.bar, { backgroundColor: c.card, borderColor: c.separator, shadowColor: c.shadow }]}
    >
      <Pressable onPress={clearSelection} hitSlop={8} accessibilityRole="button" accessibilityLabel="Seçimi bırak">
        <Ionicons name="close" size={22} color={c.textMuted} />
      </Pressable>
      <Text style={[Type.sub, styles.count, { color: c.text }]}>{selection.length} seçili</Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.run}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [styles.btn, pressed && { backgroundColor: c.fill }]}
          >
            <Ionicons name={a.icon} size={22} color={a.danger ? c.danger : c.accent} />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Space.md,
    right: Space.md,
    bottom: Space.lg,
    maxWidth: 520,
    alignSelf: 'center',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  count: { flex: 1 },
  actions: { flexDirection: 'row', gap: 2 },
  btn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
