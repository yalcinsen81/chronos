// Takvim (Fantastical'ın gün şeridi + Apple Takvim ay görünümünden esinlenir).
// Telefonda hafta şeridi olarak açılır, başlıktaki okla aya genişler. Bugünün rakamı kırmızı,
// seçili gün mavi dolu daire, notu olan günlerin altında gri nokta.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette } from '../constants/theme';
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
import TodayPulse from './TodayPulse';

export default function CalendarView({ alwaysMonth = false, onPick }: { alwaysMonth?: boolean; onPick?: () => void }) {
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

  const step = (dir: 1 | -1) => setAnchor(showMonth ? startOfMonth(addMonths(anchor, dir)) : addDays(anchor, 7 * dir));
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
          <Text style={[Type.title, { color: c.text }]}>
            {TR_MONTHS[titleDate.getMonth()]} <Text style={{ color: c.textMuted }}>{titleDate.getFullYear()}</Text>
          </Text>
          {!alwaysMonth && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.accent} />}
        </Pressable>
        <View style={styles.arrows}>
          {showMonth && anchor.slice(0, 7) !== todayISO().slice(0, 7) && (
            <Pressable
              onPress={() => setAnchor(todayISO())}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Bu aya dön"
              style={[styles.todayChip, { backgroundColor: c.accentSoft }]}
            >
              <Text style={[Type.caption, { color: c.accent }]}>Bugün</Text>
            </Pressable>
          )}
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

      <Animated.View key={showMonth ? `m${anchor.slice(0, 7)}` : 'w'} entering={FadeIn.duration(180)}>
        {rows.map((r) => (
          <View key={r[0].iso} style={styles.row}>
            {r.map((cell) => {
              const selected = cell.iso === date;
              const has = (counts[cell.iso] ?? 0) > 0;
              return (
                <Pressable
                  key={cell.iso}
                  onPress={() => {
                    selectDate(cell.iso);
                    onPick?.();
                  }}
                  style={styles.cell}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.day} ${TR_MONTHS[fromISODate(cell.iso).getMonth()]}`}
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.circle,
                      cell.isToday && !selected && { backgroundColor: c.accentSoft },
                      selected && { backgroundColor: c.accent },
                    ]}
                  >
                    {cell.isToday && <TodayPulse color={c.accent} radius={18} />}
                    <Text
                      style={[
                        styles.num,
                        { color: !cell.inMonth ? c.textFaint : cell.isWeekend ? c.textMuted : c.text },
                        cell.isToday && { color: c.accent, fontWeight: '700' },
                        selected && { color: c.onAccent, fontWeight: '700' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: has ? c.accent : 'transparent', opacity: cell.inMonth ? 0.55 : 0.25 },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function Arrow({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xs,
    height: 44,
  },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Space.sm },
  arrows: { flexDirection: 'row', alignItems: 'center' },
  todayChip: {
    paddingHorizontal: Space.md,
    height: 28,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    marginRight: Space.xs,
  },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingTop: Space.xs, paddingBottom: Space.sm, letterSpacing: 0.8 },
  cell: { flex: 1, alignItems: 'center', paddingTop: 2, paddingBottom: 4 },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 17, fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
});
