// Gradyanlı özet kartı: seçili gün, not sayıları, sıradaki saatli not ve tamamlanma halkası.

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Space, usePalette } from '../constants/theme';
import { addDays, fromISODate, todayISO, TR_MONTHS, formatWeekday, type ISODate } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import ProgressRing from './ProgressRing';

export function dayLabel(date: ISODate): string {
  const today = todayISO();
  if (date === today) return 'Bugün';
  if (date === addDays(today, 1)) return 'Yarın';
  if (date === addDays(today, -1)) return 'Dün';
  return formatWeekday(date);
}

export default function SummaryCard() {
  const c = usePalette();
  const { date, notes } = useAgenda();
  const d = fromISODate(date);
  const done = notes.filter((n) => n.is_completed).length;
  const total = notes.length;
  const next = notes.find((n) => n.time_slot && !n.is_completed);

  return (
    <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      {/* Derinlik için yarı saydam daireler */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />

      <View style={styles.top}>
        <View style={styles.dateBlock}>
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: c.onHero }]}>{dayLabel(date).toLocaleUpperCase('tr-TR')}</Text>
          </View>
          <Text style={[styles.day, { color: c.onHero }]}>
            {d.getDate()} {TR_MONTHS[d.getMonth()]}
          </Text>
          <Text style={[styles.weekday, { color: c.onHeroMuted }]}>
            {formatWeekday(date)}, {d.getFullYear()}
          </Text>
        </View>
        <ProgressRing
          size={72}
          stroke={7}
          progress={total ? done / total : 0}
          color={c.onHero}
          track="rgba(255,255,255,0.22)"
          label={total ? `%${Math.round((done / total) * 100)}` : '–'}
          labelColor={c.onHero}
        />
      </View>

      <View style={styles.stats}>
        <Stat icon="document-text-outline" value={String(total)} label="not" />
        <View style={styles.sep} />
        <Stat icon="checkmark-done-outline" value={String(done)} label="bitti" />
        <View style={styles.sep} />
        <View style={styles.next}>
          <Ionicons name="time-outline" size={16} color={c.onHeroMuted} />
          <Text numberOfLines={1} style={[styles.nextText, { color: c.onHero }]}>
            {next ? `${next.time_slot}  ${next.text_content}` : 'Saatli not yok'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const c = usePalette();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={c.onHeroMuted} />
      <Text style={[styles.statValue, { color: c.onHero }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.onHeroMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Space.xl, overflow: 'hidden', gap: Space.lg },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  blobA: { width: 220, height: 220, top: -90, right: -60 },
  blobB: { width: 140, height: 140, bottom: -70, left: -30, backgroundColor: 'rgba(255,255,255,0.07)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBlock: { gap: 2, flexShrink: 1 },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: Space.sm,
  },
  chipText: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  day: { fontFamily: Fonts.extrabold, fontSize: 30, letterSpacing: -0.8 },
  weekday: { fontFamily: Fonts.medium, fontSize: 14 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: 10,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14 },
  statLabel: { fontFamily: Fonts.medium, fontSize: 13 },
  sep: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.25)' },
  next: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  nextText: { flex: 1, fontFamily: Fonts.semibold, fontSize: 13 },
});
