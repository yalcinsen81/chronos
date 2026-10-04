// Aylık Plan: 6x7 gün ızgarası + sağ kenarda ay indeks sekmeleri (cilt sekmeleri).
// Her gün hücresi bir bırakma alanıdır: Havuz'dan sürüklenen notlar buraya bırakılabilir.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HANDWRITING_FONT, InkColors, PaperColors } from '../../constants/theme';
import {
  addMonths,
  fromISODate,
  getMonthMatrix,
  isoWeekNumber,
  toISODate,
  TR_MONTHS,
  TR_MONTHS_SHORT,
  TR_WEEKDAYS_SHORT,
} from '../../services/calendar';
import { haptics } from '../../services/haptics';
import { useAgenda } from '../../state/AgendaContext';
import { DropZone } from '../dnd/DragContext';

const TAB_COLORS = ['#B5523B', '#C7843B', '#C7A34A', '#7E9A4E', '#4E8A7A', '#4E6E9A', '#6B5A9A', '#9A5A86'];

export default function MonthView() {
  const { date, goTo, repo, notebook, revision } = useAgenda();
  const d = fromISODate(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!notebook) return;
    const first = weeks[0][0].iso;
    const last = weeks[5][6].iso;
    repo.countEntriesByDate(notebook.id, first, last).then(setCounts);
  }, [repo, notebook, weeks, revision]);

  const changeMonth = (delta: number) => {
    haptics.pageTurn();
    goTo('month', addMonths(date, delta));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Pressable onPress={() => goTo('year')}>
            <Text style={styles.title}>
              {TR_MONTHS[month]} <Text style={styles.titleYear}>{year}</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text style={styles.weekNo}> </Text>
          {TR_WEEKDAYS_SHORT.map((w) => (
            <Text key={w} style={styles.weekday}>
              {w}
            </Text>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={week[0].iso} style={[styles.row, styles.week]}>
            <Text style={styles.weekNo}>{isoWeekNumber(week[0].iso)}</Text>
            {week.map((c) => (
              <DropZone key={c.iso} date={c.iso} style={styles.cell}>
                <Pressable
                  style={styles.cellInner}
                  onPress={() => {
                    haptics.pageTurn();
                    goTo('day', c.iso);
                  }}
                >
                  <View style={[styles.dayBadge, c.isToday && styles.todayBadge]}>
                    <Text
                      style={[
                        styles.dayText,
                        !c.inMonth && styles.muted,
                        c.isWeekend && styles.weekend,
                        c.isToday && styles.todayText,
                      ]}
                    >
                      {c.day}
                    </Text>
                  </View>
                  {counts[c.iso] ? (
                    <View style={styles.dots}>
                      {Array.from({ length: Math.min(4, counts[c.iso]) }).map((_, i) => (
                        <View key={i} style={styles.dot} />
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              </DropZone>
            ))}
          </View>
        ))}
      </View>

      {/* Cilt sekmeleri: sayfa kenarından taşan renkli ay indeksleri */}
      <View style={styles.tabs}>
        {TR_MONTHS_SHORT.map((name, i) => {
          const active = i === month;
          return (
            <Pressable
              key={name}
              onPress={() => {
                haptics.toolChange();
                goTo('month', toISODate(new Date(year, i, 1)));
              }}
              style={[styles.tab, { backgroundColor: TAB_COLORS[i % TAB_COLORS.length] }, active && styles.tabActive]}
            >
              <Text style={styles.tabText}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, flexDirection: 'row' },
  page: { flex: 1, padding: 14, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  arrow: { fontSize: 30, color: InkColors.midnight, paddingHorizontal: 8 },
  title: { fontFamily: HANDWRITING_FONT, fontSize: 38, color: InkColors.midnight },
  titleYear: { fontSize: 24, color: '#8A7F68' },
  row: { flexDirection: 'row' },
  week: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderColor: PaperColors.gridLine },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, color: '#7A6F5A', paddingBottom: 4 },
  weekNo: { width: 22, fontSize: 9, color: '#B0A58E', paddingTop: 4 },
  cell: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: PaperColors.gridLine },
  cellInner: { flex: 1, padding: 4 },
  dayBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  todayBadge: { borderWidth: 1.5, borderColor: InkColors.red },
  dayText: { fontFamily: HANDWRITING_FONT, fontSize: 20, color: InkColors.black },
  todayText: { color: InkColors.red },
  muted: { opacity: 0.25 },
  weekend: { color: '#8A6A5A' },
  dots: { flexDirection: 'row', gap: 3, marginTop: 2, paddingLeft: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: InkColors.midnight, opacity: 0.8 },
  tabs: { width: 30, paddingTop: 150, paddingBottom: 110, justifyContent: 'space-between' }, // üstte Havuz sekmesine yer bırakılır
  tab: {
    height: 30,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: 'center',
    marginRight: 6,
    opacity: 0.8,
  },
  tabActive: { marginRight: 0, opacity: 1 },
  tabText: { color: '#FFF', fontSize: 9, fontWeight: '700', textAlign: 'center' },
});
