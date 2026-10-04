// Kumaş ayraç: sayfanın üst kenarından sarkan kurdele. Dokununca bugüne döner.
// Hafif sallanma Reanimated yay fiziğiyle verilir.

import { Pressable, StyleSheet } from 'react-native';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { CoverColors } from '../../constants/theme';

const W = 18;
const H = 110;

const ribbonPath = (() => {
  const b = Skia.PathBuilder.Make();
  b.moveTo(0, 0).lineTo(W, 0).lineTo(W, H).lineTo(W / 2, H - 9).lineTo(0, H).close();
  return b.detach();
})();

export default function RibbonBookmark({ onPress, label }: { onPress: () => void; label?: string }) {
  const swing = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));

  return (
    <Pressable
      onPress={() => {
        swing.value = withSequence(withSpring(9, { damping: 4 }), withSpring(0, { damping: 6, stiffness: 120 }));
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Ayraç'}
      hitSlop={8}
    >
      <Animated.View style={[styles.ribbon, style]}>
        <Canvas style={{ width: W, height: H }}>
          <Path path={ribbonPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(W, 0)}
              colors={['#6E1E1E', CoverColors.ribbon, '#A83A3A', CoverColors.ribbon, '#6E1E1E']}
            />
          </Path>
        </Canvas>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ribbon: { width: W, height: H, transformOrigin: 'top' },
});
