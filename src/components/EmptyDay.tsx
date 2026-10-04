// Boş gün: sade, sessiz bir cümle.

import { StyleSheet, Text, View } from 'react-native';

import { Space, Type, usePalette } from '../constants/theme';

export default function EmptyDay({ title, hint, height }: { title: string; hint: string; height?: number }) {
  const c = usePalette();
  return (
    <View
      style={[styles.wrap, height != null && { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[Type.sub, { color: c.textMuted }]}>{title}</Text>
      <Text style={[Type.caption, styles.hint, { color: c.textFaint }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: Space.xs, paddingHorizontal: Space.md },
  hint: { textAlign: 'center', fontWeight: '400' },
});
