// Gün başlığı (Things'in "Bugün" başlığı gibi): simge + büyük başlık + tarih satırı.

import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Space, Type, usePalette } from '../constants/theme';
import { addDays, formatLong, formatWeekday, todayISO, type ISODate } from '../services/calendar';

export function dayTitle(date: ISODate): string {
  const today = todayISO();
  if (date === today) return 'Bugün';
  if (date === addDays(today, 1)) return 'Yarın';
  if (date === addDays(today, -1)) return 'Dün';
  return formatWeekday(date);
}

export default function DayHeader({ date, open }: { date: ISODate; open: number }) {
  const c = usePalette();
  const today = todayISO();
  const isToday = date === today;
  const past = date < today;
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons
          name={isToday ? 'star' : past ? 'time' : 'calendar'}
          size={26}
          color={isToday ? c.star : past ? c.textMuted : c.today}
        />
        <Text style={[Type.largeTitle, { color: c.text }]} accessibilityRole="header">
          {dayTitle(date)}
        </Text>
      </View>
      <Text style={[Type.sub, { color: c.textMuted }]}>
        {formatLong(date)}
        {isToday || date === addDays(today, 1) || date === addDays(today, -1) ? `, ${formatWeekday(date)}` : ''}
        {open > 0 ? `  ·  ${open} açık not` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, paddingTop: Space.xl, paddingBottom: Space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
