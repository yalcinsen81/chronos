// Basılma geri bildirimi: basınca hafifçe küçülür, bırakınca yaylanarak döner (isteğe bağlı titreşim).

import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '../services/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressScale({
  style,
  scale = 0.95,
  haptic = false,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number; haptic?: boolean }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => {
        s.value = withTiming(scale, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 12, stiffness: 260 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics.tap();
        onPress?.(e);
      }}
    />
  );
}
