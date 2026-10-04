// Not yazma kartı: çok satırlı geniş yazı alanı, renk seçimi ve gradyanlı "Ekle" düğmesi.
// Web'de Ctrl/Cmd + Enter ile de eklenir; telefonda Enter yeni satır açar.

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cardShadow, Fonts, NOTE_TAG_KEYS, NoteTags, Radius, Space, tagColor, usePalette, type NoteTag } from '../constants/theme';
import { fromISODate, TR_MONTHS } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import { webNoOutline } from './webStyles';
import { dayLabel } from './SummaryCard';

const Composer = forwardRef<TextInput>(function Composer(_props, ref) {
  const c = usePalette();
  const { addNote, date } = useAgenda();
  const [text, setText] = useState('');
  const [color, setColor] = useState<NoteTag>('indigo');
  const [focused, setFocused] = useState(false);
  const canSend = text.trim().length > 0;
  const d = fromISODate(date);
  const tint = tagColor(color, c);

  const submit = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    await addNote(value, color);
    if (ref && typeof ref === 'object') ref.current?.focus();
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: focused ? tint : c.border },
        cardShadow(c),
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.headIcon, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="create-outline" size={18} color={c.accent} />
        </View>
        <Text style={[styles.headTitle, { color: c.text }]}>Yeni not</Text>
        <Text style={[styles.headDate, { color: c.textMuted }]}>
          {dayLabel(date)} · {d.getDate()} {TR_MONTHS[d.getMonth()]}
        </Text>
      </View>

      <TextInput
        ref={ref}
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={(e) => {
          // Web: Ctrl/Cmd + Enter ile ekle
          const ne = e.nativeEvent as unknown as { key: string; ctrlKey?: boolean; metaKey?: boolean };
          if (Platform.OS === 'web' && ne.key === 'Enter' && (ne.ctrlKey || ne.metaKey)) {
            (e as unknown as { preventDefault?: () => void }).preventDefault?.();
            submit();
          }
        }}
        placeholder={'Aklındakini yaz…\nBaşına saat eklersen sıralanır: 14:30 Toplantı'}
        placeholderTextColor={c.textFaint}
        style={[styles.input, webNoOutline, { color: c.text, backgroundColor: c.surfaceAlt }]}
        accessibilityLabel="Yeni not"
      />

      <View style={styles.foot}>
        <View style={styles.swatches}>
          {NOTE_TAG_KEYS.map((k) => {
            const active = k === color;
            return (
              <Pressable
                key={k}
                onPress={() => setColor(k)}
                hitSlop={4}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={NoteTags[k].label}
                style={[styles.swatchRing, active && { borderColor: tagColor(k, c) }]}
              >
                <View style={[styles.swatch, { backgroundColor: tagColor(k, c) }]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={submit} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Notu ekle">
          {({ pressed }) =>
            canSend ? (
              <LinearGradient
                colors={c.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.send, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add" size={20} color={c.onHero} />
                <Text style={[styles.sendText, { color: c.onHero }]}>Ekle</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.send, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="add" size={20} color={c.textFaint} />
                <Text style={[styles.sendText, { color: c.textFaint }]}>Ekle</Text>
              </View>
            )
          }
        </Pressable>
      </View>
    </View>
  );
});

export default Composer;

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Space.lg, gap: Space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  headIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontFamily: Fonts.bold, fontSize: 16, flex: 1 },
  headDate: { fontFamily: Fonts.semibold, fontSize: 13 },
  input: {
    minHeight: 132,
    maxHeight: 260,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.md,
    fontFamily: Fonts.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  swatchRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 46,
    paddingLeft: Space.md,
    paddingRight: Space.lg + 2,
    borderRadius: Radius.pill,
  },
  sendText: { fontFamily: Fonts.bold, fontSize: 15 },
});
