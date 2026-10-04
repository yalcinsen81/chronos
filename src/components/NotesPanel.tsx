// Seçili günün notları: liste, tamamlandı işareti, dokunarak düzenleme ve altta hızlı not yazma alanı.

import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Space, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { addDays, formatLong, formatWeekday, todayISO, type ISODate } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';

function dayLabel(date: ISODate): string {
  const today = todayISO();
  if (date === today) return 'Bugün';
  if (date === addDays(today, 1)) return 'Yarın';
  if (date === addDays(today, -1)) return 'Dün';
  return formatWeekday(date);
}

/** Notu düzenleme alanına geri yazarken saati başa ekler: "14:30 Diş hekimi" */
const toDraft = (n: EntryWithDate) => (n.time_slot ? `${n.time_slot} ${n.text_content}` : n.text_content);

export default function NotesPanel() {
  const c = usePalette();
  const { date, notes, addNote } = useAgenda();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => setEditingId(null), [date]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    await addNote(value);
    inputRef.current?.focus();
  };

  const done = notes.filter((n) => n.is_completed).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: c.accent }]}>{dayLabel(date).toLocaleUpperCase('tr-TR')}</Text>
          <Text style={[styles.title, { color: c.text }]}>{formatLong(date)}</Text>
        </View>
        {notes.length > 0 && (
          <Text style={[styles.count, { color: c.textMuted }]}>
            {done}/{notes.length}
          </Text>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        style={styles.list}
        contentContainerStyle={notes.length === 0 ? styles.emptyWrap : styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Pressable onPress={() => inputRef.current?.focus()} style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: c.textMuted }]}>Bu gün için not yok</Text>
            <Text style={[styles.emptyHint, { color: c.textFaint }]}>
              Aşağıya yazıp gönder. Başına saat yazarsan sıralanır: "14:30 Diş hekimi"
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <NoteRow
            note={item}
            editing={editingId === item.id}
            onEdit={() => setEditingId(item.id)}
            onEndEdit={() => setEditingId(null)}
          />
        )}
      />

      <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="Not ekle…"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel="Yeni not"
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Notu ekle"
          style={[styles.send, { backgroundColor: text.trim() ? c.accent : c.surfaceAlt }]}
        >
          <Text style={[styles.sendText, { color: text.trim() ? c.onAccent : c.textFaint }]}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NoteRow({
  note,
  editing,
  onEdit,
  onEndEdit,
}: {
  note: EntryWithDate;
  editing: boolean;
  onEdit: () => void;
  onEndEdit: () => void;
}) {
  const c = usePalette();
  const { toggleNote, updateNote, deleteNote } = useAgenda();
  const [draft, setDraft] = useState(toDraft(note));

  useEffect(() => {
    if (editing) setDraft(toDraft(note));
  }, [editing, note]);

  const commit = async () => {
    const value = draft.trim();
    if (value && value !== toDraft(note)) await updateNote(note.id, value);
    onEndEdit();
  };

  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable
        onPress={() => toggleNote(note.id)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: note.is_completed }}
        style={[
          styles.check,
          { borderColor: note.is_completed ? c.accent : c.textFaint },
          note.is_completed && { backgroundColor: c.accent },
        ]}
      >
        {note.is_completed && <Text style={[styles.checkMark, { color: c.onAccent }]}>✓</Text>}
      </Pressable>

      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          submitBehavior="blurAndSubmit"
          style={[styles.rowInput, { color: c.text }]}
        />
      ) : (
        <Pressable onPress={onEdit} style={styles.rowBody} accessibilityHint="Düzenlemek için dokun">
          {note.time_slot && (
            <Text style={[styles.time, { color: c.accent, backgroundColor: c.accentSoft }]}>{note.time_slot}</Text>
          )}
          <Text
            style={[
              styles.rowText,
              { color: note.is_completed ? c.textFaint : c.text },
              note.is_completed && styles.struck,
            ]}
          >
            {note.text_content}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => deleteNote(note.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Notu sil"
        style={({ pressed }) => [styles.del, pressed && { backgroundColor: c.surfaceAlt }]}
      >
        <Text style={[styles.delText, { color: c.textFaint }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: Space.lg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: Space.md },
  headerText: { gap: 2 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  count: { fontSize: 13, fontVariant: ['tabular-nums'] },
  list: { flex: 1 },
  listContent: { gap: Space.sm, paddingBottom: Space.md },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: Space.xl, paddingVertical: Space.xl, gap: Space.xs },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingLeft: Space.md,
    paddingRight: Space.xs,
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: Space.md },
  rowText: { flex: 1, fontSize: 15, lineHeight: 21 },
  rowInput: { flex: 1, fontSize: 15, paddingVertical: Space.md },
  struck: { textDecorationLine: 'line-through' },
  time: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  del: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  delText: { fontSize: 22, lineHeight: 24 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingLeft: Space.lg,
    paddingRight: 6,
    paddingVertical: 6,
    marginVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: Space.sm },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
