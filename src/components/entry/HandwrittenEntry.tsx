// El yazısı fontuyla yazılmış ajanda girişi.
// Yeni girişlerde metin soldan sağa "mürekkep akıyormuş" gibi açılır (kağıt renkli örtü animasyonu)
// ve mürekkep ıslaktan kuruya hafifçe koyulaşır.

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { HANDWRITING_FONT, PaperColors } from '../../constants/theme';
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
  const reveal = useSharedValue(fresh ? 0 : 1);
  const wet = useSharedValue(fresh ? 1 : 0);

  useEffect(() => {
    if (!fresh) {
      reveal.value = 1;
      wet.value = 0;
      return;
    }
    // Yazma hızı: karakter başına ~45 ms, en fazla 1.8 sn
    const duration = Math.min(1800, Math.max(500, entry.text_content.length * 45));
    reveal.value = 0;
    reveal.value = withTiming(1, { duration, easing: Easing.inOut(Easing.quad) });
    wet.value = withDelay(duration, withTiming(0, { duration: 1200 }));
  }, [fresh, entry.text_content.length, reveal, wet]);

  // Metnin üstündeki kağıt renkli örtü soldan sağa çekilir; ölçüm gerektirmez
  const coverStyle = useAnimatedStyle(() => ({ left: `${reveal.value * 100}%` }));
  const inkStyle = useAnimatedStyle(() => ({ opacity: 0.82 + 0.18 * (1 - wet.value) }));

  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} hitSlop={6} style={styles.box} accessibilityRole="checkbox" accessibilityState={{ checked: entry.is_completed }}>
        <Text style={[styles.boxText, { color: inkColor }]}>{entry.is_completed ? '☒' : '☐'}</Text>
      </Pressable>
      <View style={styles.mask}>
        <Animated.Text
          numberOfLines={2}
          style={[
            styles.text,
            { color: inkColor, fontSize, lineHeight: fontSize * 1.25 },
            entry.is_completed && styles.done,
            inkStyle,
          ]}
        >
          {entry.text_content}
        </Animated.Text>
        <Animated.View pointerEvents="none" style={[styles.cover, coverStyle]} />
      </View>
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
  cover: { position: 'absolute', top: 0, bottom: 0, right: 0, backgroundColor: PaperColors.ivory },
  text: { fontFamily: HANDWRITING_FONT, flexShrink: 1 },
  done: { textDecorationLine: 'line-through', opacity: 0.55 },
  pin: { marginLeft: 6, marginTop: -8 },
});
