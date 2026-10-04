// Boş gün: küçük bir çizim ve davet eden bir cümle.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Space, Type, usePalette } from '../constants/theme';

export default function EmptyDay({ title, hint, height }: { title: string; hint: string; height?: number }) {
  const c = usePalette();
  return (
    <View
      style={[styles.wrap, height != null && { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Svg width={64} height={64} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={32} fill={c.accentSoft} />
        <Path d="M36 14 L40.5 31.5 L58 36 L40.5 40.5 L36 58 L31.5 40.5 L14 36 L31.5 31.5 Z" fill={c.accent} />
        <Circle cx={55} cy={17} r={3} fill={c.star} />
        <Circle cx={16} cy={54} r={2.2} fill={c.accent} opacity={0.5} />
      </Svg>
      <Text style={[Type.bodyBold, { color: c.text }]}>{title}</Text>
      <Text style={[Type.caption, styles.hint, { color: c.textMuted }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: Space.xs, paddingHorizontal: Space.md },
  hint: { textAlign: 'center', fontWeight: '400' },
});
