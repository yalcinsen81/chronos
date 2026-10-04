// Alarm zili: alarm yeni kurulunca kısa bir sallanma animasyonu oynar (ilk çizimde oynamaz).

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function Bell({ active, size = 15, color }: { active: boolean; size?: number; color: string }) {
  const angle = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (active) {
      angle.value = withSequence(
        withTiming(-16, { duration: 70 }),
        withRepeat(withTiming(16, { duration: 110 }), 5, true),
        withTiming(0, { duration: 70 }),
      );
    }
  }, [active, angle]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={active ? 'alarm' : 'alarm-outline'} size={size} color={color} />
    </Animated.View>
  );
}
