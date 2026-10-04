// Tamamlama kutlaması: bir günün bütün notları bitince kısa bir konfeti patlaması.
// useCelebrate, "açık not var" durumundan "hepsi bitti"ye geçişi yakalar; CelebrationLayer konfetiyi çizer.

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { NoteTags, usePalette } from '../constants/theme';
import { haptics } from '../services/haptics';

/** Açık not kalmayınca (ve en az bir not varken) artan sayaç döner */
export function useCelebrate(open: number, total: number): number {
  const prev = useRef({ open, total });
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const p = prev.current;
    if (total > 0 && open === 0 && p.open > 0) {
      setBurst((b) => b + 1);
      haptics.tap();
    }
    prev.current = { open, total };
  }, [open, total]);
  return burst;
}

const PIECES = 26;

function Piece({ index, color }: { index: number; color: string }) {
  const spec = useMemo(() => {
    const angle = (index / PIECES) * Math.PI * 2 + Math.random() * 0.5;
    return {
      dx: Math.cos(angle) * (70 + Math.random() * 120),
      dy: Math.sin(angle) * (60 + Math.random() * 90) - 30,
      rot: (Math.random() - 0.5) * 720,
      w: 5 + Math.random() * 4,
      h: 8 + Math.random() * 5,
      delay: Math.random() * 90,
      dur: 900 + Math.random() * 500,
      round: index % 3 === 0,
    };
  }, [index]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: spec.dur, easing: Easing.out(Easing.quad) }));
  }, [t, spec]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: spec.dx * t.value },
      { translateY: spec.dy * t.value + 110 * t.value * t.value },
      { rotate: `${spec.rot * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: spec.w,
          height: spec.round ? spec.w : spec.h,
          backgroundColor: color,
          borderRadius: spec.round ? spec.w : 2,
        },
        style,
      ]}
    />
  );
}

export function CelebrationLayer({ burst, top = 70 }: { burst: number; top?: number }) {
  const c = usePalette();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (burst === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, [burst]);
  if (!show) return null;
  const colors = [c.accent, c.star, NoteTags.green[c.scheme], NoteTags.blue[c.scheme], NoteTags.purple[c.scheme]];
  return (
    <View pointerEvents="none" style={[styles.layer, { top }]}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={`${burst}-${i}`} index={i} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, height: 0, alignItems: 'center', zIndex: 20 },
  piece: { position: 'absolute' },
});
