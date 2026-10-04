// Yaklaşan alarmlar: üst çubuktaki zil düğmesi ve açılan liste.
// Zilin üstündeki sayı kurulu alarm sayısıdır; listeden bir alarma dokununca o gün ve notu açılır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { addDays, formatWeekday, fromISODate, todayISO, TR_MONTHS } from '../services/calendar';
import { splitNote } from '../services/notes';
import { reminderLabel, upcomingAlarms } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';

type Alarm = EntryWithDate & { fireAt: Date };

/** "Bugün", "Yarın" veya "Salı, 6 Ekim" */
function dayLabel(iso: string | null): string {
  if (!iso) return '';
  const today = todayISO();
  if (iso === today) return 'Bugün';
  if (iso === addDays(today, 1)) return 'Yarın';
  const d = fromISODate(iso);
  return `${formatWeekday(iso)}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function AlarmButton({ onOpenNote }: { onOpenNote: (n: EntryWithDate) => void }) {
  const c = usePalette();
  const { repo, revision, selectDate } = useAgenda();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    repo.listEntriesWithReminder().then((list) => alive && setAlarms(upcomingAlarms(list)));
    return () => {
      alive = false;
    };
  }, [repo, revision, open]);

  const pick = (a: Alarm) => {
    setOpen(false);
    if (a.date) selectDate(a.date);
    onOpenNote(a);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Alarmlar: ${alarms.length}`}
        style={({ pressed }) => [styles.bell, pressed && { backgroundColor: c.fill }]}
      >
        <Ionicons
          name={alarms.length ? 'alarm' : 'alarm-outline'}
          size={20}
          color={alarms.length ? c.accent : c.text}
        />
        {alarms.length > 0 && (
          <View style={[styles.badge, { backgroundColor: c.accent, borderColor: c.bg }]}>
            <Text style={[Type.micro, { color: c.onAccent, letterSpacing: 0 }]}>{alarms.length}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
            onPress={() => undefined}
          >
            <View style={styles.head}>
              <Ionicons name="alarm" size={20} color={c.accent} />
              <Text style={[Type.title, { color: c.text, flex: 1 }]}>Yaklaşan alarmlar</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
              >
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>
            {alarms.length === 0 ? (
              <Text style={[Type.sub, styles.empty, { color: c.textMuted }]}>
                Kurulu alarm yok. Saati olan bir notun yanındaki zile dokunarak alarm kurabilirsin.
              </Text>
            ) : (
              <ScrollView style={styles.list}>
                {alarms.map((a, i) => {
                  const { title, body } = splitNote(a.text_content);
                  const showDay = i === 0 || alarms[i - 1].date !== a.date;
                  return (
                    <Animated.View key={a.id} entering={FadeInDown.duration(200).delay(Math.min(i, 8) * 40)}>
                      {showDay && (
                        <Text style={[Type.micro, styles.day, { color: c.textMuted }]}>
                          {dayLabel(a.date).toUpperCase()}
                        </Text>
                      )}
                      <Pressable
                        onPress={() => pick(a)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.row,
                          { borderBottomColor: c.separator },
                          pressed && { backgroundColor: c.fill },
                        ]}
                      >
                        <View style={[styles.stripe, { backgroundColor: tagColor(a.color, c) ?? c.accent }]} />
                        <Text style={[Type.bodyBold, styles.time, { color: c.accent }]}>{a.time_slot}</Text>
                        <View style={styles.flex}>
                          <Text numberOfLines={1} style={[Type.sub, { color: c.text }]}>
                            {title || body}
                          </Text>
                          <Text style={[Type.caption, { color: c.textMuted }]}>
                            {reminderLabel(a.reminder_minutes)} · {hhmm(a.fireAt)}'de çalar
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 1,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  empty: { paddingHorizontal: Space.lg, paddingVertical: Space.md },
  list: { flexGrow: 0 },
  day: { paddingHorizontal: Space.lg, paddingTop: Space.md, paddingBottom: Space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stripe: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  time: { fontVariant: ['tabular-nums'], minWidth: 50 },
});
