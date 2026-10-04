// Takvim kartı: hafta şeridi (varsayılan, telefonda yer kazandırır) ve açılır ay ızgarası.
// Ay/hafta gezinmesi seçili günü değiştirmez; yalnızca bir güne dokunmak değiştirir.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { cardShadow, Fonts, Radius, Space, usePalette } from '../constants/theme';
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

export default function CalendarCard({ alwaysMonth = false }: { alwaysMonth?: boolean }) {
  const c = usePalette();
  const { date, selectDate, repo, notebookId, revision } = useAgenda();
  const [expanded, setExpanded] = useState(alwaysMonth);
  const [anchor, setAnchor] = useState<ISODate>(date); // görünen hafta/ayı belirleyen gün
  const [counts, setCounts] = useState<Record<string, number>>({});
  const showMonth = alwaysMonth || expanded;

  // Seçili gün değişince (ör. "Bugün" düğmesi) görünüm ona kayar
  useEffect(() => setAnchor(date), [date]);

  const a = fromISODate(anchor);
  const monthWeeks = useMemo(() => getMonthMatrix(a.getFullYear(), a.getMonth()), [anchor]); // eslint-disable-line react-hooks/exhaustive-deps
  const week = useMemo(() => {
    const start = startOfWeek(anchor);
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i): DayCell => {
      const iso = addDays(start, i);
      const d = fromISODate(iso);
      return { iso, day: d.getDate(), inMonth: true, isToday: iso === today, isWeekend: i >= 5 };
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

  // Başlıkta görünen ay: hafta şeridinde haftanın perşembesine göre (ay geçişlerinde doğru ay)
  const titleDate = showMonth ? a : fromISODate(addDays(startOfWeek(anchor), 3));

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, cardShadow(c)]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>
          {TR_MONTHS[titleDate.getMonth()]} <Text style={{ color: c.textFaint }}>{titleDate.getFullYear()}</Text>
        </Text>
        <View style={styles.actions}>
          <IconButton icon="chevron-back" label={showMonth ? 'Önceki ay' : 'Önceki hafta'} onPress={() => step(-1)} />
          <IconButton icon="chevron-forward" label={showMonth ? 'Sonraki ay' : 'Sonraki hafta'} onPress={() => step(1)} />
          {!alwaysMonth && (
            <IconButton
              icon={expanded ? 'contract-outline' : 'calendar-outline'}
              label={expanded ? 'Haftalık görünüm' : 'Aylık görünüm'}
              onPress={() => setExpanded((v) => !v)}
              active={expanded}
            />
          )}
        </View>
      </View>

      <View style={styles.row}>
        {TR_WEEKDAYS_SHORT.map((w, i) => (
          <Text key={w} style={[styles.weekday, { color: i >= 5 ? c.accent : c.textFaint }]}>
            {w}
          </Text>
        ))}
      </View>

      <Animated.View key={showMonth ? 'm' : 'w'} entering={FadeIn.duration(180)}>
        {rows.map((r) => (
          <View key={r[0].iso} style={styles.row}>
            {r.map((cell) => (
              <DayButton
                key={cell.iso}
                cell={cell}
                tall={!showMonth}
                selected={cell.iso === date}
                count={counts[cell.iso] ?? 0}
                onPress={() => selectDate(cell.iso)}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function DayButton({
  cell,
  selected,
  count,
  tall,
  onPress,
}: {
  cell: DayCell;
  selected: boolean;
  count: number;
  tall: boolean;
  onPress: () => void;
}) {
  const c = usePalette();
  const fg = selected ? c.onAccent : cell.isToday ? c.accent : cell.inMonth ? c.text : c.textFaint;
  return (
    <Pressable
      onPress={onPress}
      style={styles.cell}
      accessibilityRole="button"
      accessibilityLabel={`${cell.day} ${TR_MONTHS[fromISODate(cell.iso).getMonth()]}`}
      accessibilityState={{ selected }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.day,
            tall && styles.dayTall,
            pressed && !selected && { backgroundColor: c.surfaceAlt },
            !selected && cell.isToday && { backgroundColor: c.accentSoft },
            selected && [styles.daySelected, { backgroundColor: c.accent, shadowColor: c.accent }],
          ]}
        >
          <Text style={[styles.dayText, { color: fg }, (selected || cell.isToday) && { fontFamily: Fonts.bold }]}>
            {cell.day}
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: Math.min(3, count) }).map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: selected ? c.onAccent : c.accent }]} />
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: active ? c.accentSoft : pressed ? c.surfaceAlt : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? c.accent : c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xs,
    paddingVertical: Space.xs,
  },
  title: { fontFamily: Fonts.bold, fontSize: 18, letterSpacing: -0.3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  icon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: Fonts.semibold, fontSize: 11, paddingVertical: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 40, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  dayTall: { height: 52 },
  daySelected: { shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  dayText: { fontFamily: Fonts.medium, fontSize: 15, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 2, height: 4, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
