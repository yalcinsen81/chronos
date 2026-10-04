// Ana defter iskeleti: üst gezinme satırı (Yıl › Ay › Gün), aktif görünüm, Havuz sekmesi,
// zaman tüneli şeridi, Hızlı Giriş "+" butonu ve sesli not mikrofonu.

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HANDWRITING_FONT, InkColors } from '../../constants/theme';
import type { EntryWithDate } from '../../db/repository';
import { fromISODate, TR_MONTHS, type ISODate } from '../../services/calendar';
import { haptics } from '../../services/haptics';
import { useAgenda } from '../../state/AgendaContext';
import VoiceNoteButton from '../audio/VoiceNoteButton';
import DaySpread from '../calendar/DaySpread';
import MonthView from '../calendar/MonthView';
import TimelineStrip from '../calendar/TimelineStrip';
import YearView from '../calendar/YearView';
import { PaperBackground } from '../canvas/PaperBackground';
import { DragProvider } from '../dnd/DragContext';
import InboxPool from '../entry/InboxPool';
import QuickEntryModal from '../entry/QuickEntryModal';

export default function NotebookShell() {
  const { level, date, goTo, moveEntry, ready } = useAgenda();
  const insets = useSafeAreaInsets();
  const [quickOpen, setQuickOpen] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onDrop = useCallback(
    (entry: EntryWithDate, target: ISODate, time?: string | null) => {
      // Saat çizgisine bırakılırsa saat de atanır; gün hücresine bırakılırsa mevcut saat korunur
      void moveEntry(entry.id, target, time === undefined ? undefined : time);
    },
    [moveEntry],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p.width === width && p.height === height ? p : { width, height }));
  };

  const d = fromISODate(date);
  const crumbs: { label: string; active: boolean; onPress: () => void }[] = [
    { label: String(d.getFullYear()), active: level === 'year', onPress: () => goTo('year') },
    { label: TR_MONTHS[d.getMonth()], active: level === 'month', onPress: () => goTo('month') },
    { label: String(d.getDate()), active: level === 'day', onPress: () => goTo('day') },
  ];

  return (
    <DragProvider onDrop={onDrop}>
      <View style={styles.root} onLayout={onLayout}>
        {size.width > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <PaperBackground width={size.width} height={size.height} pageType="blank" paperStyle="aged" />
          </Canvas>
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <View style={styles.crumbs}>
            {crumbs.map((c, i) => (
              <View key={i} style={styles.crumbRow}>
                {i > 0 && <Text style={styles.sep}>›</Text>}
                <Pressable
                  onPress={() => {
                    haptics.toolChange();
                    c.onPress();
                  }}
                  hitSlop={6}
                >
                  <Text style={[styles.crumb, c.active && styles.crumbActive]}>{c.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <VoiceNoteButton />
        </View>

        <View style={styles.content}>
          {ready && level === 'year' && <YearView />}
          {ready && level === 'month' && <MonthView />}
          {ready && level === 'day' && <DaySpread />}
        </View>

        <View style={{ paddingBottom: insets.bottom }}>
          <TimelineStrip />
        </View>

        <Pressable
          style={[styles.fab, { bottom: 92 + insets.bottom }]}
          onPress={() => {
            haptics.toolChange();
            setQuickOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Hızlı giriş"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>

        <InboxPool />

        <QuickEntryModal visible={quickOpen} onClose={() => setQuickOpen(false)} fallbackDate={level === 'day' ? date : null} />
      </View>
    </DragProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4, zIndex: 20 },
  crumbs: { flexDirection: 'row', alignItems: 'center' },
  crumbRow: { flexDirection: 'row', alignItems: 'center' },
  sep: { marginHorizontal: 6, color: '#9A8F78', fontSize: 18 },
  crumb: { fontFamily: HANDWRITING_FONT, fontSize: 24, color: '#8A7F68' },
  crumbActive: { color: InkColors.midnight, textDecorationLine: 'underline' },
  content: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#FFE98A',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 40,
  },
  fabText: { fontSize: 34, color: InkColors.midnight, marginTop: -3 },
});
