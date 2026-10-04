// Takvim (Fantastical'ın gün şeridi + Apple Takvim ay görünümünden esinlenir).
// Telefonda hafta şeridi olarak açılır, başlıktaki okla aya genişler. Bugünün rakamı kırmızı,
// seçili gün mavi dolu daire, notu olan günlerin altında gri nokta.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Space, Type, usePalette } from '../constants/theme';
import {
  addDays,
  addMonths,
  fromISODate,
  getMonthMatrix,
  startOfMonth,
  startOfWeek,
  todayISO,
  TR_MONTHS,
  TR_WEEKDAYS_SHORT,
  type DayCell,
  type ISODate,
} from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';

export default function CalendarView({ alwaysMonth = false }: { alwaysMonth?: boolean }) {
  const c = usePalette();
  const { date, selectDate, repo, notebookId, revision } = useAgenda();
  const [expanded, setExpanded] = useState(alwaysMonth);
  const [anchor, setAnchor] = useState<ISODate>(date);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const showMonth = alwaysMonth || expanded;

  useEffect(() => setAnchor(date), [date]);

  const a = fromISODate(anchor);
  const monthWeeks = useMemo(() => getMonthMatrix(a.getFullYear(), a.getMonth()), [anchor]); // eslint-disable-line react-hooks/exhaustive-deps
  const week = useMemo(() => {
    const start = startOfWeek(anchor);
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i): DayCell => {
      const iso = addDays(start, i);
      return { iso, day: fromISODate(iso).getDate(), inMonth: true, isToday: iso === today, isWeekend: i >= 5 };
    });
  }, [anchor]);

  const rows = showMonth ? monthWeeks : [week];
  const from = rows[0][0].iso;
  const to = rows[rows.length - 1][6].iso;

  useEffect(() => {
    if (!notebookId) return;
    repo.countEntriesByDate(notebookId, from, to).then(setCounts);
  }, [repo, notebookId, from, to, revision]);

  const step = (dir: 1 | -1) =>
    setAnchor(showMonth ? startOfMonth(addMonths(anchor, dir)) : addDays(anchor, 7 * dir));
  // Hafta şeridinde başlık, haftanın perşembesinin ayını gösterir (ay geçişlerinde doğru ay)
  const titleDate = showMonth ? a : fromISODate(addDays(startOfWeek(anchor), 3));

  return (
    <Animated.View layout={LinearTransition.duration(200)} style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => !alwaysMonth && setExpanded((v) => !v)}
          disabled={alwaysMonth}
          style={styles.titleBtn}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Haftalık görünüm' : 'Aylık görünüm'}
        >
          <Text style={[Type.bodyBold, { color: c.text }]}>
            {TR_MONTHS[titleDate.getMonth()]} <Text style={{ color: c.textMuted, fontWeight: '400' }}>{titleDate.getFullYear()}</Text>
          </Text>
          {!alwaysMonth && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.accent} />}
        </Pressable>
        <View style={styles.arrows}>
          <Arrow icon="chevron-back" label={showMonth ? 'Önceki ay' : 'Önceki hafta'} onPress={() => step(-1)} />
          <Arrow icon="chevron-forward" label={showMonth ? 'Sonraki ay' : 'Sonraki hafta'} onPress={() => step(1)} />
        </View>
      </View>

      <View style={styles.row}>
        {TR_WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={[Type.micro, styles.weekday, { color: c.textFaint }]}>
            {w.toLocaleUpperCase('tr-TR')}
          </Text>
        ))}
      </View>

      <Animated.View key={showMonth ? 'm' : 'w'} entering={FadeIn.duration(160)}>
        {rows.map((r) => (
          <View key={r[0].iso} style={styles.row}>
            {r.map((cell) => {
              const selected = cell.iso === date;
              const has = (counts[cell.iso] ?? 0) > 0;
              return (
                <Pressable
                  key={cell.iso}
                  onPress={() => selectDate(cell.iso)}
                  style={styles.cell}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.day} ${TR_MONTHS[fromISODate(cell.iso).getMonth()]}`}
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.circle, selected && { backgroundColor: cell.isToday ? c.today : c.accent }]}>
                    <Text
                      style={[
                        styles.num,
                        { color: cell.inMonth ? c.text : c.textFaint },
                        cell.isToday && { color: c.today, fontWeight: '700' },
                        selected && { color: c.onAccent, fontWeight: '700' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: has ? c.textFaint : 'transparent' }]} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function Arrow({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.arrow, pressed && { backgroundColor: c.fill }]}
    >
      <Ionicons name={icon} size={20} color={c.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Space.md, paddingBottom: Space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.xs, height: 44 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Space.sm },
  arrows: { flexDirection: 'row' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingBottom: 6 },
  cell: { flex: 1, alignItems: 'center', paddingTop: 2, paddingBottom: 4 },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 17, fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
});
