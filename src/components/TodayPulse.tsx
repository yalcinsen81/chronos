// Bugünün rakamının arkasında hafifçe yanıp sönen halka (hafta şeridi ve ay takvimi paylaşır).
// Sistemde "hareketi azalt" açıksa durağan kalır.

import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function TodayPulse({ color, radius = 17 }: { color: string; radius?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => {
        if (!alive || reduce) return;
        t.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.1 + 0.4 * t.value, transform: [{ scale: 1 + 0.22 * t.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: color }, style]}
    />
  );
}
