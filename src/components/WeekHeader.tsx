// Üst çubuk: ay / hafta numarası, alarmlar, hafta okları, "Bugün" ve ay takvimi açılır penceresi.
// Telefonda altında 7 günlük şerit vardır (güne dokununca o sütuna kayar).

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Radius, Space, Type, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import { addDays, fromISODate, isoWeekNumber, todayISO, TR_MONTHS, TR_WEEKDAYS_SHORT } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import type { EntryWithDate } from '../db/repository';
import AlarmButton from './AlarmList';
import CalendarView from './CalendarView';
import PressScale from './PressScale';
import SearchSheet from './SearchSheet';
import SettingsSheet from './SettingsSheet';

export default function WeekHeader({
  showStrip,
  onOpenNote,
}: {
  showStrip: boolean;
  onOpenNote: (n: EntryWithDate) => void;
}) {
  const c = usePalette();
  const { date, weekStart, weekDays, weekNotes, selectDate, view, showWeek } = useAgenda();
  const { width } = useWindowDimensions();
  const day = view === 'day';
  const step = day ? 1 : 7;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Şerit görünürken oklar şeridin iki ucundadır (dar ekranda üst çubuk sığsın); yoksa üst çubukta durur
  const arrowsInStrip = showStrip;
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
        {day && (
          <PressScale
            onPress={showWeek}
            haptic
            accessibilityRole="button"
            accessibilityLabel="Haftaya dön"
            style={[styles.back, { backgroundColor: c.accentSoft }]}
          >
            <Ionicons name="chevron-back" size={16} color={c.accent} />
            <Text style={[Type.caption, { color: c.accent }]}>Hafta</Text>
          </PressScale>
        )}
        {(!day || width >= WIDE_BREAKPOINT) && (
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
        )}
        {day && width < WIDE_BREAKPOINT && <View style={styles.spacer} />}
        <View style={styles.actions}>
          {!arrowsInStrip && (
            <IconBtn
              icon="chevron-back"
              label={day ? 'Önceki gün' : 'Önceki hafta'}
              onPress={() => selectDate(addDays(date, -step))}
            />
          )}
          <PressScale
            onPress={() => selectDate(today)}
            accessibilityRole="button"
            accessibilityLabel="Bugün"
            style={[styles.todayBtn, { backgroundColor: c.accentSoft }]}
          >
            <Text style={[Type.caption, { color: c.accent, fontWeight: '700' }]}>Bugün</Text>
          </PressScale>
          {!arrowsInStrip && (
            <IconBtn
              icon="chevron-forward"
              label={day ? 'Sonraki gün' : 'Sonraki hafta'}
              onPress={() => selectDate(addDays(date, step))}
            />
          )}
          <AlarmButton onOpenNote={onOpenNote} />
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Menü"
            style={({ pressed }) => [styles.icon, pressed && { backgroundColor: c.fill }]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={c.text} />
          </Pressable>
        </View>
      </View>

      {showStrip && (
        <View style={styles.strip}>
          {arrowsInStrip && (
            <IconBtn
              icon="chevron-back"
              label={day ? 'Önceki gün' : 'Önceki hafta'}
              onPress={() => selectDate(addDays(date, -step))}
              small
            />
          )}
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
                <Text style={[Type.micro, { color: c.textFaint }]}>
                  {TR_WEEKDAYS_SHORT[i].toLocaleUpperCase('tr-TR')}
                </Text>
                <Animated.View
                  key={selected ? 'on' : 'off'}
                  entering={selected ? ZoomIn.springify().damping(13) : undefined}
                  style={[styles.stripNum, selected && { backgroundColor: c.accent }]}
                >
                  <Text
                    style={[
                      Type.bodyBold,
                      {
                        color: selected ? c.onAccent : isToday ? c.accent : c.text,
                        fontWeight: selected || isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {fromISODate(d).getDate()}
                  </Text>
                </Animated.View>
                <View style={[styles.dot, { backgroundColor: has ? c.textFaint : 'transparent' }]} />
              </Pressable>
            );
          })}
          {arrowsInStrip && (
            <IconBtn
              icon="chevron-forward"
              label={day ? 'Sonraki gün' : 'Sonraki hafta'}
              onPress={() => selectDate(addDays(date, step))}
              small
            />
          )}
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.picker, { backgroundColor: c.card, borderColor: c.separator }]}
            onPress={() => undefined}
          >
            <CalendarView alwaysMonth onPick={() => setPickerOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: c.card, borderColor: c.separator, shadowColor: c.shadow }]}
            onPress={() => undefined}
          >
            {(
              [
                { icon: 'search', label: 'Ara', run: () => setSearchOpen(true) },
                { icon: 'settings-outline', label: 'Ayarlar', run: () => setSettingsOpen(true) },
              ] as const
            ).map((it) => (
              <Pressable
                key={it.label}
                onPress={() => {
                  setMenuOpen(false);
                  it.run();
                }}
                accessibilityRole="button"
                accessibilityLabel={it.label}
                style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: c.fill }]}
              >
                <Ionicons name={it.icon} size={19} color={c.accent} />
                <Text style={[Type.body, { color: c.text }]}>{it.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <SearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} onOpenNote={onOpenNote} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function IconBtn({
  icon,
  label,
  onPress,
  small,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
  small?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.icon, small && styles.iconSmall, pressed && { backgroundColor: c.fill }]}
    >
      <Ionicons name={icon} size={small ? 18 : 20} color={c.text} />
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
    paddingLeft: 6,
    paddingRight: Space.md,
    borderRadius: Radius.pill,
  },
  spacer: { flex: 1 },
  titleBtn: { flexShrink: 1, marginRight: Space.sm },
  titleCol: { flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayBtn: {
    paddingHorizontal: Space.md,
    height: 30,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  iconSmall: { width: 28, height: 34, borderRadius: 14, alignSelf: 'center' },
  strip: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Space.xs, paddingBottom: Space.sm },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 56, paddingHorizontal: Space.lg },
  menu: {
    minWidth: 170,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Space.xs,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.md, height: 44 },
  stripDay: { flex: 1, alignItems: 'center', gap: 4 },
  stripNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  picker: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Space.sm,
  },
});
