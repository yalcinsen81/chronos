// Açık not kartı (Things'te bir yapılacağı açınca beliren kart gibi): başlık, geniş açıklama alanı,
// saat, alarm, renk etiketi; yeni notta "Vazgeç / Ekle", var olan notta "Sil / Bitti".
// Saat alanı boşsa başlığın başındaki/sonundaki saat ("14:30 Toplantı") otomatik alınır.
// Alarm saat ister; ilk alarm seçiminde bildirim izni istenir.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { NOTE_TAG_KEYS, NoteTags, Radius, Space, tagColor, Type, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { joinNote, normalizeTime, parseNote, splitNote } from '../services/notes';
import { remindersSupported, requestReminderPermission } from '../services/reminders';
import { REMINDER_OPTIONS, reminderLabel } from '../services/reminderTime';
import { useAgenda } from '../state/AgendaContext';
import Checkbox from './Checkbox';
import { webNoOutline } from './webStyles';

export default function NoteEditor({
  note,
  startWithAlarm = false,
  onClose,
}: {
  note?: EntryWithDate;
  startWithAlarm?: boolean;
  onClose: () => void;
}) {
  const c = usePalette();
  const { saveNote, deleteNote, toggleNote } = useAgenda();
  const initial = note ? splitNote(note.text_content) : { title: '', body: '' };
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [time, setTime] = useState(note?.time_slot ?? '');
  const [color, setColor] = useState<string | null>(note?.color ?? null);
  const [timeError, setTimeError] = useState(false);
  const [reminder, setReminder] = useState<number | null>(note?.reminder_minutes ?? null);
  const [alarmOpen, setAlarmOpen] = useState(startWithAlarm);
  const [alarmHint, setAlarmHint] = useState<string | null>(null);
  const bodyRef = useRef<TextInput>(null);
  const isNew = !note;
  const canSave = (title.trim() || body.trim()).length > 0;

  const save = async () => {
    if (!canSave) {
      onClose();
      return;
    }
    let t = normalizeTime(time);
    if (t === undefined) {
      setTimeError(true);
      return;
    }
    let ttl = title;
    if (t === null) {
      const p = parseNote(title);
      ttl = p.text;
      t = p.time;
    }
    if (reminder != null && !t) {
      setTimeError(true);
      setAlarmHint('Alarm için saat gir');
      return;
    }
    await saveNote({ id: note?.id, text: joinNote(ttl, body), time: t, color, reminder });
    onClose();
  };

  // Web: Ctrl/Cmd + Enter kaydeder, Esc kapatır
  const onKey = (e: unknown) => {
    if (Platform.OS !== 'web') return;
    const ne = (e as { nativeEvent: { key: string; ctrlKey?: boolean; metaKey?: boolean } }).nativeEvent;
    if (ne.key === 'Enter' && (ne.ctrlKey || ne.metaKey)) save();
    if (ne.key === 'Escape') onClose();
  };

  const tint = tagColor(color, c);

  const chooseReminder = async (minutes: number | null) => {
    setReminder(minutes);
    setAlarmOpen(false);
    if (minutes == null) {
      setAlarmHint(null);
      return;
    }
    if (!time.trim() && !parseNote(title).time) setAlarmHint('Alarm için saat gir');
    else if (!remindersSupported) setAlarmHint('Tarayıcı önizlemesinde alarm çalmaz; telefonda çalar.');
    else
      setAlarmHint((await requestReminderPermission()) ? null : "Bildirim izni kapalı. Ayarlar > Bildirimler'den aç.");
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.duration(200)}
      style={[styles.card, { backgroundColor: c.card, shadowColor: c.shadow, borderColor: c.separator }]}
    >
      <View style={styles.titleRow}>
        <View style={styles.checkWrap}>
          <Checkbox
            checked={Boolean(note?.is_completed)}
            onPress={note ? () => toggleNote(note.id) : undefined}
            tint={tint}
          />
        </View>
        <TextInput
          autoFocus={!startWithAlarm}
          value={title}
          onChangeText={setTitle}
          onKeyPress={onKey}
          onSubmitEditing={() => bodyRef.current?.focus()}
          submitBehavior="submit"
          returnKeyType="next"
          placeholder={isNew ? 'Yeni not' : 'Başlık'}
          placeholderTextColor={c.textFaint}
          style={[Type.bodyBold, styles.title, webNoOutline, { color: c.text }]}
          accessibilityLabel="Not başlığı"
        />
      </View>

      <TextInput
        ref={bodyRef}
        value={body}
        onChangeText={setBody}
        onKeyPress={onKey}
        multiline
        textAlignVertical="top"
        placeholder="Notlar"
        placeholderTextColor={c.textFaint}
        style={[Type.sub, styles.body, webNoOutline, { color: c.text }]}
        accessibilityLabel="Not açıklaması"
      />

      <View style={styles.footer}>
        <View style={styles.chips}>
          <View
            style={[styles.timeChip, { backgroundColor: c.fill, borderColor: timeError ? c.danger : 'transparent' }]}
          >
            <Ionicons name="time-outline" size={16} color={time ? c.accent : c.textMuted} />
            <TextInput
              value={time}
              onChangeText={(v) => {
                setTime(v);
                setTimeError(false);
                if (alarmHint === 'Alarm için saat gir') setAlarmHint(null);
              }}
              onKeyPress={onKey}
              onBlur={() => {
                const n = normalizeTime(time);
                if (n) setTime(n);
                else if (n === undefined) setTimeError(true);
              }}
              placeholder="Saat"
              placeholderTextColor={c.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={[Type.caption, styles.timeInput, webNoOutline, { color: c.text }]}
              accessibilityLabel="Saat"
            />
          </View>

          <Pressable
            onPress={() => setAlarmOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`Alarm: ${reminderLabel(reminder)}`}
            style={[
              styles.timeChip,
              { backgroundColor: reminder != null ? c.accentSoft : c.fill, borderColor: 'transparent' },
            ]}
          >
            <Ionicons
              name={reminder != null ? 'alarm' : 'alarm-outline'}
              size={16}
              color={reminder != null ? c.accent : c.textMuted}
            />
            <Text style={[Type.caption, { color: reminder != null ? c.accent : c.textMuted }]}>
              {reminderLabel(reminder, true)}
            </Text>
          </Pressable>
        </View>

        <View style={styles.tags}>
          {NOTE_TAG_KEYS.map((k) => {
            const active = color === k;
            const col = tagColor(k, c)!;
            return (
              <Pressable
                key={k}
                onPress={() => setColor(active ? null : k)}
                hitSlop={3}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${NoteTags[k].label} etiket`}
                style={[styles.tagRing, active && { borderColor: col }]}
              >
                <View style={[styles.tagDot, { backgroundColor: col }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {alarmOpen && (
        <Animated.View entering={FadeInDown.duration(160)} style={styles.alarmOptions}>
          {[{ minutes: null as number | null, label: 'Alarm yok' }, ...REMINDER_OPTIONS].map((o) => {
            const active = o.minutes === reminder;
            return (
              <Pressable
                key={String(o.minutes)}
                onPress={() => chooseReminder(o.minutes)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.option, { backgroundColor: active ? c.accent : c.fill }]}
              >
                <Text style={[Type.caption, { color: active ? c.onAccent : c.text }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
      {alarmHint && (
        <Text style={[Type.caption, styles.hint, { color: alarmHint.startsWith('Tarayıcı') ? c.textMuted : c.danger }]}>
          {alarmHint}
        </Text>
      )}

      <View style={[styles.actions, { borderTopColor: c.separator }]}>
        {isNew ? (
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Text style={[Type.sub, { color: c.textMuted }]}>Vazgeç</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              deleteNote(note.id);
              onClose();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notu sil"
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={18} color={c.danger} />
            <Text style={[Type.sub, { color: c.danger }]}>Sil</Text>
          </Pressable>
        )}
        <Pressable
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel={isNew ? 'Notu ekle' : 'Kaydet'}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: c.accent, opacity: canSave ? (pressed ? 0.85 : 1) : 0.4 },
          ]}
        >
          <Text style={[Type.sub, { color: c.onAccent, fontWeight: '600' }]}>{isNew ? 'Ekle' : 'Bitti'}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Space.md,
    marginVertical: Space.sm,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.lg },
  checkWrap: { paddingTop: 1 },
  title: { flex: 1, paddingVertical: 6 },
  body: {
    minHeight: 140,
    maxHeight: 320,
    paddingHorizontal: Space.lg,
    paddingLeft: Space.lg + 32,
    paddingVertical: Space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chips: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  alarmOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.md,
  },
  option: { paddingHorizontal: Space.md, height: 32, borderRadius: Radius.pill, justifyContent: 'center' },
  hint: { paddingHorizontal: Space.lg, paddingBottom: Space.md, fontWeight: '400' },
  timeInput: { width: 52, paddingVertical: 0, fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tagRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagDot: { width: 14, height: 14, borderRadius: 7 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  save: {
    paddingHorizontal: Space.xl,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
