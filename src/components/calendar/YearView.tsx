// Yıllık Genel Bakış: 12 mini ay. Girişi olan günler mürekkep noktasıyla işaretlenir.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HANDWRITING_FONT, InkColors } from '../../constants/theme';
import { addMonths, fromISODate, getYearOverview, toISODate, TR_WEEKDAYS_SHORT } from '../../services/calendar';
import { haptics } from '../../services/haptics';
import { useAgenda } from '../../state/AgendaContext';

export default function YearView() {
  const { date, goTo, repo, notebook, revision } = useAgenda();
  const year = fromISODate(date).getFullYear();
  const months = useMemo(() => getYearOverview(year), [year]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  useEffect(() => {
    if (!notebook) return;
    repo.countEntriesByDate(notebook.id, `${year}-01-01`, `${year}-12-31`).then(setCounts);
  }, [repo, notebook, year, revision]);

  const changeYear = (delta: number) => {
    haptics.pageTurn();
    goTo('year', addMonths(date, delta * 12));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => changeYear(-1)} hitSlop={12}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Pressable onPress={() => changeYear(1)} hitSlop={12}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {months.map((m) => (
          <Pressable
            key={m.month}
            style={[styles.month, { width: `${100 / columns}%` }]}
            onPress={() => {
              haptics.pageTurn();
              goTo('month', toISODate(new Date(m.year, m.month, 1)));
            }}
          >
            <Text style={styles.monthName}>{m.name}</Text>
            <View style={styles.row}>
              {TR_WEEKDAYS_SHORT.map((w) => (
                <Text key={w} style={styles.weekday}>
                  {w[0]}
                </Text>
              ))}
            </View>
            {m.weeks.map((week, i) => (
              <View key={i} style={styles.row}>
                {week.map((c) => (
                  <View key={c.iso} style={styles.cell}>
                    {c.inMonth && (
                      <>
                        <Text style={[styles.day, c.isWeekend && styles.weekend, c.isToday && styles.today]}>{c.day}</Text>
                        {counts[c.iso] ? <View style={styles.dot} /> : null}
                      </>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 8 },
  arrow: { fontSize: 30, color: InkColors.midnight },
  year: { fontFamily: HANDWRITING_FONT, fontSize: 44, color: InkColors.midnight },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  month: { padding: 10 },
  monthName: { fontFamily: HANDWRITING_FONT, fontSize: 24, color: InkColors.red, marginBottom: 2 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 9, color: '#9A8F78' },
  cell: { flex: 1, height: 18, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 10, color: InkColors.black },
  weekend: { color: '#8A7F68' },
  today: { color: InkColors.red, fontWeight: '800' },
  dot: { position: 'absolute', bottom: 0, width: 3, height: 3, borderRadius: 2, backgroundColor: InkColors.midnight },
});
