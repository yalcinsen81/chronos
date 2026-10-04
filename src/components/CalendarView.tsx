// Aylık takvim: gün seçimi, notu olan günlerde nokta. Ay gezinmesi seçili günü değiştirmez.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, usePalette } from '../constants/theme';
import {
  addMonths,
  fromISODate,
  getMonthMatrix,
  startOfMonth,
  todayISO,
  TR_MONTHS,
  TR_WEEKDAYS_SHORT,
  type ISODate,
} from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';

export default function CalendarView() {
  const c = usePalette();
  const { date, selectDate, repo, notebookId, revision } = useAgenda();
  const [month, setMonth] = useState<ISODate>(startOfMonth(date));
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Seçili gün başka aya geçerse (ör. "Bugün") görünen ay da onu takip eder
  useEffect(() => setMonth(startOfMonth(date)), [date]);

  const d = fromISODate(month);
  const weeks = useMemo(() => getMonthMatrix(d.getFullYear(), d.getMonth()), [month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notebookId) return;
    repo.countEntriesByDate(notebookId, weeks[0][0].iso, weeks[5][6].iso).then(setCounts);
  }, [repo, notebookId, weeks, revision]);

  const today = todayISO();
  const showToday = date !== today;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>
          {TR_MONTHS[d.getMonth()]} <Text style={{ color: c.textFaint }}>{d.getFullYear()}</Text>
        </Text>
        <View style={styles.headerActions}>
          {showToday && (
            <Pressable
              onPress={() => selectDate(today)}
              style={[styles.todayBtn, { backgroundColor: c.accentSoft }]}
              accessibilityRole="button"
            >
              <Text style={[styles.todayText, { color: c.accent }]}>Bugün</Text>
            </Pressable>
          )}
          <NavButton label="‹" hint="Önceki ay" onPress={() => setMonth(addMonths(month, -1))} />
          <NavButton label="›" hint="Sonraki ay" onPress={() => setMonth(addMonths(month, 1))} />
        </View>
      </View>

      <View style={styles.row}>
        {TR_WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={[styles.weekday, { color: c.textFaint }]}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].iso} style={styles.row}>
          {week.map((cell) => {
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
                {({ pressed }) => (
                  <View
                    style={[
                      styles.day,
                      pressed && !selected && { backgroundColor: c.surfaceAlt },
                      selected && { backgroundColor: c.accent },
                      !selected && cell.isToday && { borderWidth: 1.5, borderColor: c.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: cell.inMonth ? c.text : c.textFaint },
                        cell.isToday && { color: c.accent, fontWeight: '700' },
                        selected && { color: c.onAccent, fontWeight: '700' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                    <View
                      style={[styles.dot, { backgroundColor: has ? (selected ? c.onAccent : c.accent) : 'transparent' }]}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NavButton({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={({ pressed }) => [styles.nav, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}
    >
      <Text style={[styles.navText, { color: c.text }]}>{label}</Text>
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
    paddingVertical: Space.sm,
  },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  todayBtn: { paddingHorizontal: Space.md, paddingVertical: 6, borderRadius: Radius.pill, marginRight: Space.xs },
  todayText: { fontSize: 13, fontWeight: '600' },
  nav: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 24, lineHeight: 26, fontWeight: '400' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: Space.xs },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontVariant: ['tabular-nums'] },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
