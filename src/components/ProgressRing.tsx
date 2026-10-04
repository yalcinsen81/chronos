// Dairesel ilerleme halkası: günün tamamlanan not oranı.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Fonts } from '../constants/theme';

interface Props {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  color: string;
  track: string;
  label?: string;
  labelColor: string;
}

export default function ProgressRing({ size = 64, stroke = 6, progress, color, track, label, labelColor }: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          fill="none"
        />
      </Svg>
      {label !== undefined && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 14 },
});
