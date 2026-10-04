// El yazısı fontuyla yazılmış ajanda girişi.
// Yeni girişlerde metin soldan sağa "mürekkep akıyormuş" gibi açılır (maske genişliği animasyonu)
// ve mürekkep ıslaktan kuruya hafifçe koyulaşır.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { HANDWRITING_FONT } from '../../constants/theme';
import type { EntryWithDate } from '../../db/repository';
import AudioPin from '../audio/AudioPin';

export interface HandwrittenEntryProps {
  entry: EntryWithDate;
  inkColor: string;
  fresh?: boolean;
  fontSize?: number;
  onToggle?: () => void;
  onLongPress?: () => void;
}

export default function HandwrittenEntry({ entry, inkColor, fresh = false, fontSize = 22, onToggle }: HandwrittenEntryProps) {
  const [textWidth, setTextWidth] = useState(0);
  const reveal = useSharedValue(fresh ? 0 : 1);
  const wet = useSharedValue(fresh ? 1 : 0);

  useEffect(() => {
    if (!fresh || textWidth === 0) return;
    // Yazma hızı: karakter başına ~45 ms, en fazla 1.8 sn
    const duration = Math.min(1800, Math.max(500, entry.text_content.length * 45));
    reveal.value = withTiming(1, { duration, easing: Easing.inOut(Easing.quad) });
    wet.value = withDelay(duration, withTiming(0, { duration: 1200 }));
  }, [fresh, textWidth, entry.text_content.length, reveal, wet]);

  const maskStyle = useAnimatedStyle(() => ({
    width: textWidth > 0 ? textWidth * reveal.value + 2 : undefined,
  }));
  const inkStyle = useAnimatedStyle(() => ({ opacity: 0.82 + 0.18 * (1 - wet.value) }));

  const onTextLayout = (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    if (w !== textWidth) setTextWidth(w);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} hitSlop={6} style={styles.box} accessibilityRole="checkbox" accessibilityState={{ checked: entry.is_completed }}>
        <Text style={[styles.boxText, { color: inkColor }]}>{entry.is_completed ? '☒' : '☐'}</Text>
      </Pressable>
      <Animated.View style={[styles.mask, fresh && textWidth === 0 && styles.hidden, maskStyle]}>
        <Animated.Text
          onLayout={onTextLayout}
          numberOfLines={2}
          style={[
            styles.text,
            { color: inkColor, fontSize, lineHeight: fontSize * 1.25 },
            // Ölçüldükten sonra genişlik sabitlenir; maske daralırken metin yeniden kırılmaz
            textWidth > 0 && { width: textWidth },
            entry.is_completed && styles.done,
            inkStyle,
          ]}
        >
          {entry.text_content}
        </Animated.Text>
      </Animated.View>
      {entry.audio_path && (
        <View style={styles.pin}>
          <AudioPin uri={entry.audio_path} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  box: { marginRight: 4 },
  boxText: { fontSize: 18 },
  mask: { overflow: 'hidden', flexShrink: 1 },
  hidden: { opacity: 0 },
  text: { fontFamily: HANDWRITING_FONT, flexShrink: 1 },
  done: { textDecorationLine: 'line-through', opacity: 0.55 },
  pin: { marginLeft: 6, marginTop: -8 },
});
