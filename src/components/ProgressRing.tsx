// Küçük ilerleme halkası: günün tamamlanan not oranı. Değer değişince yumuşakça dolar.
// Hepsi bitince halka dolu bir daireye ve onay işaretine dönüşür.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({
  progress,
  size = 22,
  stroke = 3,
  color,
  track,
  onColor,
}: {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  onColor: string; // dolu dairenin üstündeki onay işareti
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(progress);
  useEffect(() => {
    p.value = withTiming(progress, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, p]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  const full = progress >= 1;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill={full ? color : 'none'} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {full && (
        <View style={{ position: 'absolute' }}>
          <Ionicons name="checkmark" size={size * 0.62} color={onColor} />
        </View>
      )}
    </View>
  );
}
