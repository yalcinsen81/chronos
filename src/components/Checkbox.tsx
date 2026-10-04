// Not kutucuğu (yuvarlak). Etiket rengi verilirse işaretliyken o renge boyanır.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

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

  // İşaretlenince kutucuk küçük bir "pop" yapar; ilk çizimde oynamaz
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (checked)
      scale.value = withSequence(withTiming(0.8, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [checked, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={pop}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={[
          styles.box,
          { width: size, height: size, borderRadius: size / 2 },
          { borderColor: checked ? color : c.check },
          checked && { backgroundColor: color },
        ]}
      >
        {checked && (
          <Animated.View entering={ZoomIn.duration(160)}>
            <Ionicons name="checkmark" size={size * 0.7} color={c.onAccent} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
