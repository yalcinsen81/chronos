// Işıltılı arka plan: ShaderGradient (github.com/ruucm/shadergradient, MIT) fikrinden esinlenir ama WebGL/three.js
// kullanmaz (Expo Go'da ağır ve yazıyı bozar). Bunun yerine seçili renk temasından üç yumuşak ışık lekesi (SVG radyal
// gradyan) yavaşça süzülür. "Hareketi azalt" açıksa leke sabit durur.

import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { usePalette } from '../constants/theme';

function Blob({
  color,
  size,
  left,
  top,
  dx,
  dy,
  period,
  still,
  opacity,
}: {
  color: string;
  size: number;
  left: number;
  top: number;
  dx: number;
  dy: number;
  period: number;
  still: boolean;
  opacity: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = still ? 0 : withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, still, period]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }, { scale: 1 + 0.18 * t.value }],
  }));
  const id = `g${color.replace('#', '')}${size}`;
  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: size, height: size, opacity }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export default function Aurora({ height = 170 }: { height?: number }) {
  const c = usePalette();
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setStill)
      .catch(() => undefined);
  }, []);
  const dark = c.scheme === 'dark';
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <Blob
        color={c.accent}
        size={260}
        left={-70}
        top={-120}
        dx={90}
        dy={30}
        period={9000}
        still={still}
        opacity={dark ? 0.3 : 0.26}
      />
      <Blob
        color={c.star}
        size={220}
        left={150}
        top={-110}
        dx={-80}
        dy={40}
        period={11000}
        still={still}
        opacity={dark ? 0.24 : 0.28}
      />
      <Blob
        color={c.accent}
        size={200}
        left={300}
        top={-90}
        dx={-120}
        dy={20}
        period={13000}
        still={still}
        opacity={dark ? 0.22 : 0.18}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
