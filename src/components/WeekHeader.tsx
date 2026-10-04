// Üst çubuk: ay / hafta numarası, hafta okları, "Bugün" ve ay takvimi açılır penceresi.
// Telefonda altında 7 günlük şerit vardır (güne dokununca o sütuna kayar).

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { addDays, fromISODate, isoWeekNumber, todayISO, TR_MONTHS, TR_WEEKDAYS_SHORT } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import CalendarView from './CalendarView';

export default function WeekHeader({ showStrip }: { showStrip: boolean }) {
  const c = usePalette();
  const { date, weekStart, weekDays, weekNotes, selectDate } = useAgenda();
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = todayISO();
  const s = fromISODate(weekStart);
  const e = fromISODate(weekDays[6]);
  const title =
    s.getMonth() === e.getMonth()
      ? `${TR_MONTHS[s.getMonth()]} ${s.getFullYear()}`
      : `${TR_MONTHS[s.getMonth()].slice(0, 3)} – ${TR_MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;

  return (
    <View style={[styles.wrap, { borderBottomColor: c.separator }]}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={styles.titleBtn}
          accessibilityRole="button"
          accessibilityLabel="Takvimi aç"
        >
          <View style={styles.titleCol}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[Type.title, { color: c.text, flexShrink: 1 }]}>
                {title}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.accent} />
            </View>
            <Text style={[Type.caption, { color: c.textMuted }]}>{isoWeekNumber(weekStart)}. hafta</Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <IconBtn icon="chevron-back" label="Önceki hafta" onPress={() => selectDate(addDays(date, -7))} />
          <Pressable
            onPress={() => selectDate(today)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.todayBtn, { borderColor: c.separator }, pressed && { backgroundColor: c.fill }]}
          >
            <Text style={[Type.caption, { color: c.text }]}>Bugün</Text>
          </Pressable>
          <IconBtn icon="chevron-forward" label="Sonraki hafta" onPress={() => selectDate(addDays(date, 7))} />
        </View>
      </View>

      {showStrip && (
        <View style={styles.strip}>
          {weekDays.map((d, i) => {
            const selected = d === date;
            const isToday = d === today;
            const has = (weekNotes[d]?.length ?? 0) > 0;
            return (
              <Pressable
                key={d}
                onPress={() => selectDate(d)}
                style={styles.stripDay}
                accessibilityRole="button"
                accessibilityLabel={`${fromISODate(d).getDate()} ${TR_MONTHS[fromISODate(d).getMonth()]}`}
                accessibilityState={{ selected }}
              >
                <Text style={[Type.micro, { color: c.textFaint }]}>{TR_WEEKDAYS_SHORT[i].toLocaleUpperCase('tr-TR')}</Text>
                <View style={[styles.stripNum, selected && { backgroundColor: isToday ? c.today : c.text }]}>
                  <Text
                    style={[
                      Type.bodyBold,
                      { color: selected ? c.bg : isToday ? c.today : c.text, fontWeight: selected || isToday ? '700' : '500' },
                    ]}
                  >
                    {fromISODate(d).getDate()}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: has ? c.textFaint : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.picker, { backgroundColor: c.card, borderColor: c.separator }]} onPress={() => undefined}>
            <CalendarView alwaysMonth onPick={() => setPickerOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function IconBtn({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.icon, pressed && { backgroundColor: c.fill }]}
    >
      <Ionicons name={icon} size={20} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    gap: Space.sm,
  },
  titleBtn: { flexShrink: 1, marginRight: Space.sm },
  titleCol: { flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayBtn: { paddingHorizontal: Space.md, height: 30, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center' },
  strip: { flexDirection: 'row', paddingHorizontal: Space.sm, paddingBottom: Space.sm },
  stripDay: { flex: 1, alignItems: 'center', gap: 4 },
  stripNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  picker: { width: '100%', maxWidth: 380, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: Space.sm },
});
