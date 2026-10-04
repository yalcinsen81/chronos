// Girişin kenarına iliştirilen "ses iğnesi / raptiye". Dokununca orijinal ses kaydını çalar.

import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Canvas, Circle, Group, Line, RadialGradient, vec } from '@shopify/react-native-skia';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NoteColors } from '../../constants/theme';
import { haptics } from '../../services/haptics';

const SIZE = 26;

/** Skia ile çizilmiş raptiye: parlak kırmızı baş + metal iğne */
export function PinIcon({ size = SIZE, active = false }: { size?: number; active?: boolean }) {
  const r = size * 0.3;
  const cx = size * 0.42;
  const cy = size * 0.38;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Line p1={vec(cx, cy)} p2={vec(size * 0.86, size * 0.9)} color="#8C8C8C" strokeWidth={1.6} />
      <Group>
        <Circle cx={cx + 1} cy={cy + 1.5} r={r} color="rgba(0,0,0,0.25)" />
        <Circle cx={cx} cy={cy} r={r}>
          <RadialGradient
            c={vec(cx - r * 0.35, cy - r * 0.35)}
            r={r * 1.3}
            colors={[active ? '#FF8A80' : '#E57373', NoteColors.pin, '#6E1A1A']}
          />
        </Circle>
      </Group>
    </Canvas>
  );
}

export default function AudioPin({ uri }: { uri: string }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const loaded = useRef(false);
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (status.playing) {
      wobble.value = withRepeat(withSequence(withTiming(-8, { duration: 120 }), withTiming(8, { duration: 120 })), -1, true);
    } else {
      cancelAnimation(wobble);
      wobble.value = withTiming(0, { duration: 120 });
    }
  }, [status.playing, wobble]);

  const toggle = useCallback(async () => {
    haptics.toolChange();
    if (!loaded.current) {
      player.replace({ uri });
      loaded.current = true;
    }
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }
    player.play();
  }, [player, status, uri]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }] }));

  return (
    <Pressable onPress={toggle} hitSlop={10} accessibilityRole="button" accessibilityLabel="Ses kaydını çal">
      <Animated.View style={[styles.pin, style]}>
        <PinIcon active={status.playing} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: { width: SIZE, height: SIZE },
});
