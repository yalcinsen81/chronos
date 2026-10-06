// Gün görünümü: seçili günün saat çizelgesi. Saatli notlar saatine göre bloklar olarak, saatsizler üstte "Gün boyu"
// bölümünde durur. Boş bir saate dokununca o saatte yeni not açılır; sola/sağa kaydırınca önceki/sonraki güne geçilir.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import {
  addDays,
  formatClock,
  formatWeekday,
  fromISODate,
  todayISO,
  TR_MONTHS,
  type ISODate,
} from '../services/calendar';
import { blockDuration, HOUR_HEIGHT, hourRange, layoutDay, timeToMinutes } from '../services/dayLayout';
import { checklistProgress } from '../services/checklist';
import { parseSmart } from '../services/naturalDate';
import { splitNote } from '../services/notes';
import { reminderFireDate, reminderLabel } from '../services/reminderTime';
import { useDragSource, useDropZone } from '../platform/dnd';
import { useShortcutEvent } from '../platform/shortcuts';
import { useAgenda } from '../state/AgendaContext';
import Bell from './Bell';
import Checkbox from './Checkbox';
import { sortOpenFirst, StrikeText, TaskLine } from './DayColumn';
import EmptyDay from './EmptyDay';
import { webNoOutline } from './webStyles';

const LABEL_W = 52;
const pad = (n: number) => String(n).padStart(2, '0');

export default function DayView({
  date,
  notes,
  onOpen,
  onNew,
}: {
  date: ISODate;
  notes: EntryWithDate[];
  onOpen: (note: EntryWithDate, alarm?: boolean) => void;
  onNew: (date: ISODate, time: string | null) => void;
}) {
  const c = usePalette();
  const { saveNote, selectDate, reschedule } = useAgenda();
  const composeRef = useRef<TextInput>(null);
  useShortcutEvent('compose', () => composeRef.current?.focus());
  // Gün değişince içerik değişim yönüne doğru kayarak gelir
  const prevDate = useRef(date);
  const dir = date > prevDate.current ? 1 : date < prevDate.current ? -1 : 0;
  useEffect(() => {
    prevDate.current = date;
  }, [date]);
  const dayEntering = (dir > 0 ? FadeInRight : dir < 0 ? FadeInLeft : FadeIn).duration(240);
  const today = todayISO();
  const isToday = date === today;
  const d = fromISODate(date);

  const timed = useMemo(() => notes.filter((n) => n.time_slot), [notes]);
  const untimed = useMemo(() => sortOpenFirst(notes.filter((n) => !n.time_slot)), [notes]);
  const open = notes.filter((n) => !n.is_completed).length;
  const { start, end } = useMemo(() => hourRange(timed.map((n) => timeToMinutes(n.time_slot!))), [timed]);
  const placed = useMemo(
    () =>
      layoutDay(
        timed.map((n) => {
          const m = timeToMinutes(n.time_slot!);
          return { id: n.id, minutes: m, duration: blockDuration(m, n.end_time ? timeToMinutes(n.end_time) : null) };
        }),
      ),
    [timed],
  );
  const byId = useMemo(() => Object.fromEntries(timed.map((n) => [n.id, n])), [timed]);
  const totalH = (end - start) * HOUR_HEIGHT;
  // Sürükle-bırak: bırakılan yükseklik 15 dakikaya yuvarlanıp yeni başlangıç saati olur
  const drop = useDropZone((id, { offsetY }) => {
    const m = Math.min(
      end * 60 - 15,
      Math.max(start * 60, start * 60 + Math.round(((offsetY / HOUR_HEIGHT) * 60) / 15) * 15),
    );
    void reschedule(id, { date, time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` });
  });

  // Şimdiki zaman çizgisi (yalnızca bugünde), dakikada bir ilerler
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [isToday]);
  const nowTop = ((now.getHours() * 60 + now.getMinutes() - start * 60) / 60) * HOUR_HEIGHT;

  // Açılışta ilgili saate kaydır (bugünde şimdi, başka günde ilk not); saat zaten ekrana sığıyorsa başlık yerinde kalır
  const scroller = useRef<ScrollView>(null);
  const timelineY = useRef(0);
  const viewportH = useRef(0);
  useEffect(() => {
    const focus = isToday ? nowTop : placed[0] ? ((placed[0].minutes - start * 60) / 60) * HOUR_HEIGHT : 0;
    const t = setTimeout(() => {
      const abs = timelineY.current + focus;
      // Saat çizgisi ekranın üst kenarında yarım kesilmesin: kaydırmayı tam saat sınırına oturt, 12px pay bırak
      const raw = abs - viewportH.current / 3;
      const y =
        abs < viewportH.current - 140
          ? 0
          : Math.floor((raw - timelineY.current) / HOUR_HEIGHT) * HOUR_HEIGHT + timelineY.current - 12;
      scroller.current?.scrollTo({ y: Math.max(0, y), animated: false });
    }, 60);
    return () => clearTimeout(t);
    // yalnızca gün değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Hızlı not satırı
  const [draft, setDraft] = useState('');
  const add = async () => {
    const value = draft.trim();
    if (!value) return;
    setDraft('');
    const { text, time, endTime, date: when } = parseSmart(value);
    await saveNote({ text, time, endTime, color: null, reminder: null, date: when ?? date });
    if (when && when !== date) selectDate(when);
  };

  // Sola/sağa kaydırma: önceki / sonraki gün
  const go = useRef((_delta: number) => {});
  go.current = (delta: number) => selectDate(addDays(date, delta));
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) go.current(1);
        else if (g.dx > 60) go.current(-1);
      },
    }),
  ).current;

  const hours = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <View style={styles.flex} {...pan.panHandlers}>
      <View style={styles.fixedWrap}>
        <Animated.View key={date} entering={FadeIn.duration(200)} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={[Type.largeTitle, { color: isToday ? c.accent : c.text }]}>{formatWeekday(date)}</Text>
            <View style={styles.subRow}>
              <Text style={[Type.sub, { color: isToday ? c.accent : c.textMuted }]}>
                {d.getDate()} {TR_MONTHS[d.getMonth()]} {d.getFullYear()}
                {isToday ? '  ·  Bugün' : ''}
              </Text>
              {notes.length > 0 && (
                <Text style={[Type.caption, { color: c.textFaint }]}>
                  {open === 0 ? 'Hepsi bitti' : `${notes.length - open}/${notes.length} tamam`}
                </Text>
              )}
            </View>
            <View style={[styles.rule, { backgroundColor: isToday ? c.accent : c.text }]} />
          </View>
        </Animated.View>
      </View>
      <ScrollView
        ref={scroller}
        onLayout={(e) => (viewportH.current = e.nativeEvent.layout.height)}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={date} entering={dayEntering} style={styles.sheet}>
          <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>GÜN BOYU</Text>
          {notes.length === 0 && !draft && (
            <EmptyDay
              height={130}
              title={date < today ? 'Not yok' : 'Bu gün boş'}
              hint={date < today ? 'Bu güne not eklenmemiş.' : 'Aşağıya yaz ya da bir saate dokun.'}
            />
          )}
          {untimed.map((n, i) => (
            <TaskLine key={n.id} note={n} index={i} onOpen={(alarm) => onOpen(n, alarm)} />
          ))}
          <View style={[styles.addLine, { borderBottomColor: c.separator }]}>
            <TextInput
              ref={composeRef}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder="+ Not ekle  (saat için başa 14:30 yaz)"
              placeholderTextColor={c.textFaint}
              style={[Type.sub, styles.input, webNoOutline, { color: c.text }]}
              accessibilityLabel={`${formatWeekday(date)} için not ekle`}
            />
            {draft.trim().length > 0 && (
              <Pressable onPress={add} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ekle">
                <Ionicons name="arrow-up-circle" size={24} color={c.accent} />
              </Pressable>
            )}
          </View>

          <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>SAATLER</Text>
          <View
            ref={drop.ref}
            style={{ height: totalH + 28 }}
            onLayout={(e) => (timelineY.current = e.nativeEvent.layout.y)}
          >
            {hours.map((h) => (
              <Pressable
                key={h}
                onPress={() => onNew(date, `${pad(h)}:00`)}
                accessibilityRole="button"
                accessibilityLabel={`${pad(h)}:00 saatine not ekle`}
                style={({ pressed }) => [
                  styles.hourRow,
                  { top: (h - start) * HOUR_HEIGHT, height: h === end ? 28 : HOUR_HEIGHT },
                  pressed && { backgroundColor: c.fill },
                ]}
              >
                <Text style={[Type.micro, styles.hourLabel, { color: c.textFaint }]}>
                  {formatClock(`${pad(h)}:00`)}
                </Text>
                {/* Çizgi saat yazısının sağından başlar; yazının üstünden geçmez */}
                <View style={[styles.hourLine, { backgroundColor: c.separator }]} />
              </Pressable>
            ))}

            <View style={styles.blocks} pointerEvents="box-none">
              {placed.map((p, i) => {
                const n = byId[p.id];
                return (
                  <Block
                    key={n.id}
                    note={n}
                    index={i}
                    top={((p.minutes - start * 60) / 60) * HOUR_HEIGHT}
                    lane={p.lane}
                    lanes={p.lanes}
                    duration={p.duration}
                    nowMs={now.getTime()}
                    onOpen={onOpen}
                  />
                );
              })}
            </View>

            {isToday && nowTop >= 0 && nowTop <= totalH && (
              <View pointerEvents="none" style={[styles.now, { top: nowTop }]}>
                <View style={[styles.nowDot, { backgroundColor: c.accent }]} />
                <View style={[styles.nowLine, { backgroundColor: c.accent }]} />
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** Saatli notun çizelgedeki bloğu */
function Block({
  note,
  index,
  top,
  lane,
  lanes,
  duration,
  nowMs,
  onOpen,
}: {
  note: EntryWithDate;
  index: number;
  top: number;
  lane: number;
  lanes: number;
  duration: number;
  nowMs: number;
  onOpen: (note: EntryWithDate, alarm?: boolean) => void;
}) {
  const c = usePalette();
  const { toggleNote, openMenu, selection, toggleSelect, selecting } = useAgenda();
  const dragRef = useDragSource(note.id);
  const selected = selection.includes(note.id);
  const { title, body } = splitNote(note.text_content);
  const tint = tagColor(note.color, c) ?? c.accent;
  const done = note.is_completed;
  const alarm = note.reminder_minutes != null && !done;
  const sub = checklistProgress(body);
  // Alarmı bir saat içinde çalacaksa kalan süre yazılır (süslemeden, yalnızca bilgi)
  const fire = alarm ? reminderFireDate(note.date, note.time_slot, note.reminder_minutes) : null;
  const minsLeft = fire ? Math.ceil((fire.getTime() - nowMs) / 60_000) : null;
  const soon = minsLeft != null && minsLeft > 0 && minsLeft <= 60;

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index, 8) * 30)}
      style={[
        styles.blockSlot,
        {
          top,
          height: (duration / 60) * HOUR_HEIGHT - 3,
          left: `${(lane / lanes) * 100}%`,
          width: `${100 / lanes}%`,
        },
      ]}
    >
      <Pressable
        ref={dragRef}
        onPress={() => (selecting ? toggleSelect(note.id) : onOpen(note))}
        onLongPress={() => (selecting ? toggleSelect(note.id) : openMenu(note))}
        delayLongPress={380}
        accessibilityRole="button"
        accessibilityHint="Ayrıntılar için dokun, menü için uzun bas"
        style={({ pressed }) => [
          styles.block,
          { backgroundColor: tint + (c.scheme === 'dark' ? '33' : '22'), borderLeftColor: tint },
          selected && { borderWidth: 2, borderColor: c.accent, borderLeftWidth: 4 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Checkbox checked={done} onPress={() => toggleNote(note.id)} tint={tagColor(note.color, c)} size={16} />
        <View style={styles.blockText}>
          <StrikeText text={title || body} done={done} style={Type.sub} color={c.text} lineColor={c.textFaint} />
          <Text numberOfLines={1} style={[Type.micro, { color: done ? c.textFaint : tint }]}>
            {formatClock(note.time_slot!)}
            {note.end_time ? `–${formatClock(note.end_time)}` : ''}
            {sub.total > 0 ? `  ·  ${sub.done}/${sub.total}` : ''}
            {soon
              ? `  ·  alarm ${minsLeft} dk sonra`
              : alarm
                ? `  ·  ${reminderLabel(note.reminder_minutes, true)}`
                : ''}
          </Text>
        </View>
        {lanes < 3 && (
          <Pressable
            onPress={() => onOpen(note, true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={alarm ? `Alarm ${reminderLabel(note.reminder_minutes)}` : 'Alarm kur'}
          >
            {!done && <Bell active={alarm} size={15} color={alarm ? c.accent : c.textFaint} />}
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignItems: 'center', paddingBottom: 120 },
  sheet: { width: '100%', maxWidth: 720, paddingHorizontal: Space.lg },
  fixedWrap: { alignItems: 'center' },
  header: { paddingTop: Space.md, paddingBottom: Space.xs, gap: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { height: 2, marginTop: Space.sm, borderRadius: 1 },
  section: { marginTop: Space.lg, marginBottom: Space.xs, letterSpacing: 0.8 },
  addLine: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, height: 46, paddingHorizontal: 6 },
  hourRow: { position: 'absolute', left: 0, right: 0, borderRadius: Radius.sm },
  // Yazı yüksekliği sabit: etiketin ortası tam çizginin üstüne gelir (Android'in ek yazı boşluğu kapatılır)
  hourLabel: {
    position: 'absolute',
    left: 0,
    top: -7,
    width: LABEL_W - 10,
    height: 14,
    lineHeight: 14,
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  hourLine: { position: 'absolute', top: 0, left: LABEL_W, right: 0, height: StyleSheet.hairlineWidth },
  blocks: { position: 'absolute', top: 0, bottom: 0, left: LABEL_W, right: 0 },
  blockSlot: { position: 'absolute', paddingRight: 4, paddingTop: 2 },
  block: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
  },
  blockText: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: 'line-through' },
  now: {
    position: 'absolute',
    left: LABEL_W - 4,
    right: 0,
    height: 8,
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowLine: { flex: 1, height: 2 },
});
