// Açılış: deri kapak ve elastik bant.
// Bant parmakla çekilir (lastik direnci), bırakılınca yay fiziğiyle kapaktan kurtulur;
// ardından kapak sol kenar (cilt) etrafında 3B dönerek açılır. Dokunmak da bandı açar.

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Canvas, Fill, LinearGradient, Rect, Shader, Skia, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CoverColors, HANDWRITING_FONT } from '../../constants/theme';
import { haptics } from '../../services/haptics';
import { LEATHER_SHADER } from '../canvas/shaders';

const leather = Skia.RuntimeEffect.Make(LEATHER_SHADER);
const BAND_W = 16;
const RELEASE_AT = 70; // bu kadar çekilince bant kurtulur

export default function CoverIntro({ onOpened }: { onOpened: () => void }) {
  const { width, height } = useWindowDimensions();
  const [done, setDone] = useState(false);
  const band = useSharedValue(0); // bandın yatay çekilme miktarı
  const released = useSharedValue(false);
  const open = useSharedValue(0); // 0 kapalı → 1 açık

  const finish = useCallback(() => {
    setDone(true);
    onOpened();
  }, [onOpened]);

  const snap = useCallback(() => haptics.snap(), []);
  const turn = useCallback(() => haptics.pageTurn(), []);

  const releaseBand = () => {
    'worklet';
    if (released.value) return;
    released.value = true;
    scheduleOnRN(snap);
    // Bant yaylanarak kapağın dışına fırlar
    band.value = withSpring(width, { velocity: 2400, damping: 9, stiffness: 90 });
    open.value = withDelay(
      260,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }, (ok) => {
        if (ok) scheduleOnRN(finish);
      }),
    );
    scheduleOnRN(turn);
  };

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onUpdate((e) => {
        if (released.value) return;
        // Lastik direnci: çektikçe zorlaşır
        const t = Math.max(0, e.translationX);
        band.value = RELEASE_AT * 1.6 * (1 - Math.exp(-t / (RELEASE_AT * 1.6)));
      })
      .onEnd(() => {
        if (released.value) return;
        if (band.value >= RELEASE_AT) releaseBand();
        else band.value = withSpring(0, { damping: 6, stiffness: 220 }); // geri yaylanma
      });
    const tap = Gesture.Tap().onEnd(() => {
      if (!released.value) {
        band.value = withTiming(RELEASE_AT, { duration: 140 }, () => releaseBand());
      }
    });
    return Gesture.Exclusive(pan, tap);
  }, [band, released, open, width, snap, turn, finish]);

  const bandX = width - 70;

  const bandStyle = useAnimatedStyle(() => ({
    // Gerilirken bant ortadan dışa bükülmüş gibi hafif genişler
    transform: [{ translateX: band.value }, { scaleX: 1 + Math.min(band.value, RELEASE_AT) / 400 }],
  }));

  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { translateX: -width / 2 },
      { rotateY: `${interpolate(open.value, [0, 1], [0, -115])}deg` },
      { translateX: width / 2 },
    ],
    opacity: interpolate(open.value, [0, 0.85, 1], [1, 1, 0]),
  }));

  const shadeStyle = useAnimatedStyle(() => ({ opacity: interpolate(open.value, [0, 0.5, 1], [0, 0.35, 0]) }));

  if (done) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[StyleSheet.absoluteFill, coverStyle]}>
          <Canvas style={StyleSheet.absoluteFill}>
            {leather ? (
              <Fill>
                <Shader source={leather} uniforms={{ resolution: [width, height], baseColor: [...CoverColors.leather] }} />
              </Fill>
            ) : (
              <Fill color="#3D2417" />
            )}
            {/* Kabartma çerçeve */}
            <Rect x={24} y={24} width={width - 48} height={height - 48} color="rgba(255,240,210,0.12)" style="stroke" strokeWidth={1.5} />
          </Canvas>
          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={styles.title}>Chronos Paper</Text>
            <Text style={styles.subtitle}>{new Date().getFullYear()}</Text>
          </View>
          <Animated.View style={[styles.band, { left: bandX }, bandStyle]}>
            <Canvas style={{ width: BAND_W, height }}>
              <Rect x={0} y={0} width={BAND_W} height={height}>
                <LinearGradient start={vec(0, 0)} end={vec(BAND_W, 0)} colors={['#111', CoverColors.band, '#4A4A4A', CoverColors.band, '#111']} />
              </Rect>
            </Canvas>
          </Animated.View>
          <Text style={styles.hint}>Bandı sağa çek</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: '#000' },
  titleWrap: { position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center' },
  title: {
    fontFamily: HANDWRITING_FONT,
    fontSize: 52,
    color: 'rgba(240, 220, 180, 0.75)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 1,
  },
  subtitle: { fontSize: 14, letterSpacing: 6, color: 'rgba(240, 220, 180, 0.5)', marginTop: 6 },
  band: { position: 'absolute', top: 0, bottom: 0, width: BAND_W, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, elevation: 6 },
  hint: { position: 'absolute', bottom: 48, alignSelf: 'center', color: 'rgba(240, 220, 180, 0.5)', fontSize: 13 },
});
