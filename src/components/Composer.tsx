// Not yazma çubuğu: renk seçici, metin alanı ve gradyanlı gönder düğmesi.

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { cardShadow, Fonts, NOTE_TAG_KEYS, NoteTags, Radius, Space, tagColor, usePalette, type NoteTag } from '../constants/theme';
import { useAgenda } from '../state/AgendaContext';

const Composer = forwardRef<TextInput>(function Composer(_props, ref) {
  const c = usePalette();
  const { addNote } = useAgenda();
  const [text, setText] = useState('');
  const [color, setColor] = useState<NoteTag>('indigo');
  const [picking, setPicking] = useState(false);
  const canSend = text.trim().length > 0;

  const submit = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    await addNote(value, color);
    if (ref && typeof ref === 'object') ref.current?.focus();
  };

  return (
    <View style={styles.wrap}>
      {picking && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={[styles.palette, { backgroundColor: c.surface, borderColor: c.border }, cardShadow(c)]}
        >
          {NOTE_TAG_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                setColor(k);
                setPicking(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={NoteTags[k].label}
              style={[styles.swatchRing, k === color && { borderColor: tagColor(k, c) }]}
            >
              <View style={[styles.swatch, { backgroundColor: tagColor(k, c) }]} />
            </Pressable>
          ))}
        </Animated.View>
      )}

      <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.border }, cardShadow(c)]}>
        <Pressable
          onPress={() => setPicking((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Not rengi"
          style={[styles.colorBtn, { backgroundColor: c.surfaceAlt }]}
        >
          <View style={[styles.swatch, { backgroundColor: tagColor(color, c) }]} />
        </Pressable>
        <TextInput
          ref={ref}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="send"
          placeholder="Bir not yaz…  (ör. 14:30 Toplantı)"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel="Yeni not"
        />
        <Pressable onPress={submit} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Notu ekle">
          {canSend ? (
            <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
              <Ionicons name="arrow-up" size={20} color={c.onHero} />
            </LinearGradient>
          ) : (
            <View style={[styles.send, { backgroundColor: c.surfaceAlt }]}>
              <Ionicons name="arrow-up" size={20} color={c.textFaint} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
});

export default Composer;

const styles = StyleSheet.create({
  wrap: { gap: Space.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    padding: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontFamily: Fonts.medium, fontSize: 15, paddingVertical: Space.sm, minWidth: 0 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  palette: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: Space.xs,
    padding: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatchRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 16, height: 16, borderRadius: 8 },
});
