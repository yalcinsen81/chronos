// Uzun basma menüsü: nota uzun basınca tamamla / taşı / sil eylemleri açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import { addDays, todayISO } from '../services/calendar';
import { splitNote } from '../services/notes';
import { useAgenda } from '../state/AgendaContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function RowMenu({ onEdit }: { onEdit: (alarm?: boolean) => void }) {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const sheet = width < WIDE_BREAKPOINT;
  const { menuNote: note, closeMenu, toggleNote, moveNote, deleteNote, startSelect } = useAgenda();
  const today = todayISO();

  if (!note) return null;
  const { title, body } = splitNote(note.text_content);
  const items: { icon: IconName; label: string; danger?: boolean; run: () => void }[] = [
    { icon: 'create-outline', label: 'Düzenle', run: () => onEdit() },
    {
      icon: note.is_completed ? 'ellipse-outline' : 'checkmark-circle-outline',
      label: note.is_completed ? 'Geri al' : 'Tamamla',
      run: () => toggleNote(note.id),
    },
    ...(note.date && note.date !== today
      ? [{ icon: 'arrow-redo-outline' as IconName, label: 'Bugüne taşı', run: () => moveNote(note.id, today) }]
      : []),
    {
      icon: 'arrow-forward-circle-outline',
      label: 'Yarına taşı',
      run: () => moveNote(note.id, addDays(note.date && note.date > today ? note.date : today, 1)),
    },
    { icon: 'checkbox-outline', label: 'Seç', run: () => startSelect(note.id) },
    { icon: 'trash-outline', label: 'Sil', danger: true, run: () => deleteNote(note.id) },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeMenu}>
      <Pressable
        style={[styles.backdrop, sheet && styles.backdropSheet, { backgroundColor: c.shadow }]}
        onPress={closeMenu}
      >
        <Animated.View
          entering={sheet ? SlideInDown.duration(220) : FadeIn.duration(160)}
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
        >
          <Pressable onPress={() => undefined}>
            <Text numberOfLines={1} style={[Type.caption, styles.heading, { color: c.textMuted }]}>
              {title || body}
            </Text>
            {items.map((it) => (
              <Pressable
                key={it.label}
                onPress={() => {
                  closeMenu();
                  it.run();
                }}
                accessibilityRole="button"
                accessibilityLabel={it.label}
                style={({ pressed }) => [
                  styles.row,
                  { borderTopColor: c.separator },
                  pressed && { backgroundColor: c.fill },
                ]}
              >
                <Ionicons name={it.icon} size={20} color={it.danger ? c.danger : c.accent} />
                <Text style={[Type.body, { color: it.danger ? c.danger : c.text }]}>{it.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  backdropSheet: { justifyContent: 'flex-end', padding: Space.sm },
  panel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  heading: { paddingHorizontal: Space.lg, paddingTop: Space.md, paddingBottom: Space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    height: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
