// Not kutucuğu (Things tarzı yuvarlatılmış kare). Etiket rengi verilirse işaretliyken o renge boyanır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { usePalette } from '../constants/theme';

export default function Checkbox({
  checked,
  onPress,
  tint,
  size = 20,
}: {
  checked: boolean;
  onPress?: () => void;
  tint?: string | null;
  size?: number;
}) {
  const c = usePalette();
  const color = tint ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.box, { width: size, height: size, borderRadius: size / 4 }, { borderColor: checked ? color : c.check }, checked && { backgroundColor: color }]}
    >
      {checked && <Ionicons name="checkmark" size={size * 0.7} color={c.onAccent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
