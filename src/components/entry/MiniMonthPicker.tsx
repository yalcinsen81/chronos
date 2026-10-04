// Quick-Entry içindeki küçük takvim: ay içinde gün seçimi.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HANDWRITING_FONT, InkColors } from '../../constants/theme';
import { addMonths, fromISODate, getMonthMatrix, TR_MONTHS, TR_WEEKDAYS_SHORT, type ISODate } from '../../services/calendar';

export default function MiniMonthPicker({ value, onChange }: { value: ISODate; onChange: (iso: ISODate) => void }) {
  const [cursor, setCursor] = useState(value);
  const d = fromISODate(cursor);
  const weeks = useMemo(() => {
    const m = fromISODate(cursor);
    return getMonthMatrix(m.getFullYear(), m.getMonth());
  }, [cursor]);

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => setCursor(addMonths(cursor, -1))} hitSlop={10}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {TR_MONTHS[d.getMonth()]} {d.getFullYear()}
        </Text>
        <Pressable onPress={() => setCursor(addMonths(cursor, 1))} hitSlop={10}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {TR_WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w[0]}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((c) => {
            const selected = c.iso === value;
            return (
              <Pressable key={c.iso} style={[styles.cell, selected && styles.selected]} onPress={() => onChange(c.iso)}>
                <Text style={[styles.day, !c.inMonth && styles.muted, c.isToday && styles.today, selected && styles.selectedText]}>
                  {c.day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: HANDWRITING_FONT, fontSize: 20, color: InkColors.midnight },
  arrow: { fontSize: 22, color: InkColors.midnight, paddingHorizontal: 8 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: '#7A6F5A' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 99 },
  day: { fontSize: 13, color: InkColors.black },
  muted: { opacity: 0.3 },
  today: { fontWeight: '700', color: InkColors.red },
  selected: { backgroundColor: InkColors.midnight },
  selectedText: { color: '#FFF' },
});
