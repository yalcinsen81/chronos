// Geri al çubuğu: silme, tamamlama ve taşımadan sonra birkaç saniye görünür.

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import { useAgenda } from '../state/AgendaContext';

const VISIBLE_MS = 5000;

export default function UndoBar() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const { undo, runUndo, dismissUndo, selecting } = useAgenda();

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(dismissUndo, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [undo, dismissUndo]);

  if (!undo || selecting) return null;
  // Telefonda sağ alttaki + düğmesine yer bırakılır
  const right = width < WIDE_BREAKPOINT ? 92 : undefined;
  return (
    <Animated.View
      key={undo.id}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[styles.bar, { backgroundColor: c.text, right }]}
      accessibilityLiveRegion="polite"
    >
      <Text numberOfLines={1} style={[Type.sub, styles.label, { color: c.bg }]}>
        {undo.label}
      </Text>
      <Pressable onPress={runUndo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Geri al">
        <Text style={[Type.bodyBold, { color: c.accent }]}>Geri al</Text>
      </Pressable>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Space.lg,
    bottom: Space.xl,
    maxWidth: 380,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
  },
  label: { flex: 1, minWidth: 0 },
});
