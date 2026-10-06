// Yıl görünümü: her gün bir kare (not sayısına göre koyulaşır) ve altında sade tamamlama istatistiği.
// Bir kareye dokunmak o günü açar.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { fromISODate, todayISO, TR_MONTHS_SHORT, TR_WEEKDAYS, type ISODate } from '../services/calendar';
import { countByDate, heatLevel, summarize, yearGrid, type StatEntry } from '../services/stats';
import { useAgenda } from '../state/AgendaContext';

const CELL = 11;
const GAP = 3;
/** Koyuluk düzeyine göre vurgu rengi saydamlığı (0 boş gün için ayrıca zemin rengi kullanılır) */
const LEVEL_ALPHA = ['', '40', '70', 'A8', 'FF'] as const;

export default function YearSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = usePalette();
  const { listAll, revision, selectDate } = useAgenda();
  const today = todayISO();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const scroller = useRef<ScrollView>(null);
  const [entries, setEntries] = useState<StatEntry[]>([]);

  useEffect(() => {
    if (!visible) return;
    setYear(Number(todayISO().slice(0, 4)));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listAll().then((all) => {
      if (!alive) return;
      setEntries(all.filter((n) => n.date).map((n) => ({ date: n.date as ISODate, done: n.is_completed })));
    });
    return () => {
      alive = false;
    };
  }, [visible, listAll, revision]);

  const grid = useMemo(() => yearGrid(countByDate(entries), year), [entries, year]);
  const stats = useMemo(() => summarize(entries, today), [entries, today]);

  // Ay adı, ayın 1'ini içeren haftanın sütununun üstüne yazılır
  const monthLabels = grid.map((week) => {
    const first = week.find((cell) => cell && cell.date.endsWith('-01'));
    return first ? TR_MONTHS_SHORT[fromISODate(first.date).getMonth()] : '';
  });

  const tiles: { label: string; value: string }[] = [
    { label: 'Bu ay bitti', value: `${stats.monthDone}/${stats.monthTotal}` },
    { label: 'Bu yıl bitti', value: `${stats.yearDone}/${stats.yearTotal}` },
    { label: 'Not bitirdiğin gün', value: String(stats.activeDays) },
    { label: 'En verimli gün', value: stats.bestWeekday == null ? '-' : TR_WEEKDAYS[stats.bestWeekday] },
    { label: 'Şu anki seri', value: `${stats.currentRun} gün` },
    { label: 'En uzun seri', value: `${stats.longestRun} gün` },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={styles.head}>
            <Ionicons name="grid-outline" size={20} color={c.accent} />
            <View style={styles.yearNav}>
              <Pressable
                onPress={() => setYear((y) => y - 1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Önceki yıl"
              >
                <Ionicons name="chevron-back" size={20} color={c.text} />
              </Pressable>
              <Text style={[Type.title, { color: c.text }]}>{year}</Text>
              <Pressable
                onPress={() => setYear((y) => y + 1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Sonraki yıl"
              >
                <Ionicons name="chevron-forward" size={20} color={c.text} />
              </Pressable>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <ScrollView
              ref={scroller}
              horizontal
              showsHorizontalScrollIndicator={false}
              // Bu yıl açıldığında bugünün haftası görünür kalsın
              onContentSizeChange={() => {
                const todayWeek = grid.findIndex((w) => w.some((cell) => cell?.date === today));
                scroller.current?.scrollTo({
                  x: todayWeek < 0 ? 0 : Math.max(0, todayWeek * (CELL + GAP) - 240),
                  animated: false,
                });
              }}
            >
              <View>
                <View style={styles.monthRow}>
                  {grid.map((_, wi) =>
                    monthLabels[wi] ? (
                      <Text
                        key={wi}
                        style={[Type.micro, styles.monthText, { color: c.textMuted, left: wi * (CELL + GAP) }]}
                      >
                        {monthLabels[wi]}
                      </Text>
                    ) : null,
                  )}
                </View>
                <View style={styles.cols}>
                  {grid.map((week, wi) => (
                    <View key={wi} style={styles.col}>
                      {week.map((cell, di) =>
                        cell ? (
                          <Pressable
                            key={cell.date}
                            onPress={() => {
                              selectDate(cell.date);
                              onClose();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${cell.date}, ${cell.count} not`}
                            style={[
                              styles.cell,
                              {
                                backgroundColor:
                                  cell.count === 0 ? c.fill : c.accent + LEVEL_ALPHA[heatLevel(cell.count)],
                              },
                              cell.date === today && { borderWidth: 1.5, borderColor: c.text },
                            ]}
                          />
                        ) : (
                          <View key={di} style={styles.cell} />
                        ),
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.legend}>
              <Text style={[Type.micro, { color: c.textMuted }]}>Az</Text>
              {[0, 1, 2, 3, 4].map((l) => (
                <View
                  key={l}
                  style={[styles.cell, { backgroundColor: l === 0 ? c.fill : c.accent + LEVEL_ALPHA[l] }]}
                />
              ))}
              <Text style={[Type.micro, { color: c.textMuted }]}>Çok not</Text>
            </View>

            <View style={styles.tiles}>
              {tiles.map((t) => (
                <View key={t.label} style={[styles.tile, { backgroundColor: c.fill }]}>
                  <Text style={[Type.title, { color: c.text }]} numberOfLines={1}>
                    {t.value}
                  </Text>
                  <Text style={[Type.caption, { color: c.textMuted }]}>{t.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.lg, paddingBottom: Space.sm },
  yearNav: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  body: { paddingHorizontal: Space.lg, paddingBottom: Space.lg, gap: Space.lg },
  cols: { flexDirection: 'row', gap: GAP },
  col: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  monthRow: { height: 16 },
  monthText: { position: 'absolute', top: 0 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: GAP, alignSelf: 'flex-end' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  tile: { flexGrow: 1, flexBasis: '30%', minWidth: 120, gap: 2, padding: Space.md, borderRadius: Radius.md },
});
