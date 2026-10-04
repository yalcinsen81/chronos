// Hızlı Giriş Post-it'i: kalıcı "+" butonundan açılır.
// Yazarken metin canlı olarak ayrıştırılır ("yarın 15:00 ..." → tarih/saat önerisi).
// Kullanıcı tarih çipiyle elle seçim yaparsa ayrıştırılan tarihin önüne geçer.
// Tarih seçilmezse ve metinde tarih yoksa giriş Havuz'a düşer.

import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HANDWRITING_FONT, InkColors, NoteColors } from '../../constants/theme';
import { addDays, formatLong, formatWeekday, todayISO, type ISODate } from '../../services/calendar';
import { parseEntry } from '../../services/nlp';
import { useAgenda } from '../../state/AgendaContext';
import MiniMonthPicker from './MiniMonthPicker';

type DateChoice = { kind: 'auto' } | { kind: 'inbox' } | { kind: 'date'; iso: ISODate };

export interface QuickEntryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Takvimden açıldığında önceden seçili gün */
  initialDate?: ISODate | null;
}

export default function QuickEntryModal({ visible, onClose, initialDate }: QuickEntryModalProps) {
  const { addEntry, goTo } = useAgenda();
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<DateChoice>({ kind: 'auto' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const lift = useSharedValue(40);

  useEffect(() => {
    if (visible) {
      setText('');
      setPickerOpen(false);
      setChoice(initialDate ? { kind: 'date', iso: initialDate } : { kind: 'auto' });
      lift.value = 40;
      lift.value = withSpring(0, { damping: 12, stiffness: 160 });
    }
  }, [visible, initialDate, lift]);

  const parsed = useMemo(() => parseEntry(text), [text]);

  const target = useMemo(() => {
    if (choice.kind === 'inbox') return { date: null, time: null };
    if (choice.kind === 'date') return { date: choice.iso, time: parsed.time };
    return { date: parsed.date, time: parsed.time };
  }, [choice, parsed]);

  const save = async () => {
    // Tarih ifadesi ayrıştırıldıysa sayfaya yalnızca eylem yazılır
    const body = (parsed.matches.length > 0 && parsed.action) || text.trim();
    if (!body) return;
    const entry = await addEntry({ text: body, date: target.date, time: target.time });
    onClose();
    if (entry?.date) goTo('day', entry.date);
  };

  const today = todayISO();
  const chips: { label: string; active: boolean; onPress: () => void }[] = [
    { label: 'Otomatik', active: choice.kind === 'auto', onPress: () => setChoice({ kind: 'auto' }) },
    { label: 'Bugün', active: choice.kind === 'date' && choice.iso === today, onPress: () => setChoice({ kind: 'date', iso: today }) },
    {
      label: 'Yarın',
      active: choice.kind === 'date' && choice.iso === addDays(today, 1),
      onPress: () => setChoice({ kind: 'date', iso: addDays(today, 1) }),
    },
    { label: 'Tarih seç…', active: pickerOpen, onPress: () => setPickerOpen((v) => !v) },
    { label: 'Havuz', active: choice.kind === 'inbox', onPress: () => setChoice({ kind: 'inbox' }) },
  ];

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { rotate: '-1.2deg' }] }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <Pressable onPress={() => undefined}>
            <Animated.View style={[styles.postit, cardStyle]}>
              <View style={styles.tape} />
              <TextInput
                autoFocus
                multiline
                value={text}
                onChangeText={setText}
                placeholder="Örn: Yarın 15:00'te Ahmet Bey ile bütçe toplantısı"
                placeholderTextColor="rgba(58,50,32,0.4)"
                style={styles.input}
              />

              <Text style={styles.preview}>
                {target.date
                  ? `📅 ${formatLong(target.date)} ${formatWeekday(target.date)}${target.time ? ` · ${target.time}` : ''}`
                  : '📥 Havuz (tarihsiz)'}
              </Text>

              <View style={styles.chips}>
                {chips.map((c) => (
                  <Pressable key={c.label} onPress={c.onPress} style={[styles.chip, c.active && styles.chipActive]}>
                    <Text style={[styles.chipText, c.active && styles.chipTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>

              {pickerOpen && (
                <MiniMonthPicker
                  value={choice.kind === 'date' ? choice.iso : (parsed.date ?? today)}
                  onChange={(iso) => {
                    setChoice({ kind: 'date', iso });
                    setPickerOpen(false);
                  }}
                />
              )}

              <View style={styles.actions}>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Text style={styles.cancel}>Vazgeç</Text>
                </Pressable>
                <Pressable onPress={save} style={styles.save} disabled={!text.trim()}>
                  <Text style={styles.saveText}>Deftere yaz</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30, 24, 16, 0.35)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  postit: {
    width: 340,
    maxWidth: '100%',
    backgroundColor: NoteColors.postit,
    padding: 18,
    paddingTop: 22,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 90,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '2deg' }],
  },
  input: { fontFamily: HANDWRITING_FONT, fontSize: 26, color: '#2E2818', minHeight: 90, textAlignVertical: 'top' },
  preview: { fontSize: 13, color: '#5A4E30', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(58,50,32,0.35)' },
  chipActive: { backgroundColor: InkColors.midnight, borderColor: InkColors.midnight },
  chipText: { fontSize: 13, color: '#3A3220' },
  chipTextActive: { color: '#FFF' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cancel: { color: '#5A4E30', fontSize: 15 },
  save: { backgroundColor: InkColors.midnight, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 4 },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
