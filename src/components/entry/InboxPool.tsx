// Tarihsiz Inbox — "Havuz". Sağ kenardaki cilt sekmesinden açılır.
// Post-it'ler uzun basılarak kaldırılır; panel kapanır ve not takvimdeki bir güne,
// saat çizgisine veya alttaki zaman şeridine bırakılabilir.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HANDWRITING_FONT, NoteColors } from '../../constants/theme';
import { haptics } from '../../services/haptics';
import { useAgenda } from '../../state/AgendaContext';
import { Draggable } from '../dnd/DragContext';

const PANEL_W = 250;

export default function InboxPool() {
  const { inbox, deleteEntry } = useAgenda();
  const [open, setOpen] = useState(false);
  const x = useSharedValue(PANEL_W);

  const setPanel = useCallback(
    (next: boolean) => {
      setOpen(next);
      x.value = withSpring(next ? 0 : PANEL_W, { damping: 18, stiffness: 180 });
      haptics.toolChange();
    },
    [x],
  );

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View style={[styles.container, panelStyle]} pointerEvents="box-none">
      {/* Cilt sekmesi: panel kapalıyken ekranın sağ kenarından taşar */}
      <Pressable onPress={() => setPanel(!open)} style={styles.tab} accessibilityRole="button" accessibilityLabel="Havuz">
        <Text style={styles.tabText}>Havuz</Text>
        {inbox.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inbox.length}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.panel}>
        <Text style={styles.title}>Havuz</Text>
        <Text style={styles.hint}>Tarihsiz notlar. Uzun bas, bir güne sürükle.</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {inbox.length === 0 && <Text style={styles.empty}>Havuz boş.</Text>}
          {inbox.map((e, i) => (
            <Draggable key={e.id} entry={e} onLift={() => setPanel(false)}>
              <View style={[styles.note, { transform: [{ rotate: `${((i * 37) % 5) - 2}deg` }] }]}>
                <Text style={styles.noteText}>{e.text_content}</Text>
                <Pressable onPress={() => deleteEntry(e.id)} hitSlop={8} style={styles.remove}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            </Draggable>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 70,
    bottom: 90,
    right: 0,
    width: PANEL_W,
    flexDirection: 'row',
    zIndex: 50,
  },
  tab: {
    position: 'absolute',
    left: -34,
    top: 40,
    width: 34,
    height: 96,
    backgroundColor: '#C7A34A',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: { transform: [{ rotate: '-90deg' }], width: 80, textAlign: 'center', color: '#FFF8E6', fontWeight: '700', fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -8,
    left: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: NoteColors.pin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  panel: {
    flex: 1,
    backgroundColor: '#EFE6D2',
    borderLeftWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontFamily: HANDWRITING_FONT, fontSize: 28, paddingHorizontal: 16, color: '#3A3220' },
  hint: { fontSize: 12, color: '#7A6F5A', paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 14, gap: 12 },
  empty: { color: '#7A6F5A', fontStyle: 'italic' },
  note: {
    backgroundColor: NoteColors.postit,
    padding: 12,
    paddingRight: 24,
    minHeight: 64,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
  },
  noteText: { fontFamily: HANDWRITING_FONT, fontSize: 20, color: '#3A3220' },
  remove: { position: 'absolute', top: 2, right: 6 },
  removeText: { fontSize: 18, color: '#7A6F5A' },
});
