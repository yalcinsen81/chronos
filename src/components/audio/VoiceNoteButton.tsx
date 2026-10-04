// Vintage diktafon mikrofonu + Voice-to-Task hattı.
//
//  1. Ses, cihazın yerel konuşma tanıma köprüsü (expo-speech-recognition) dinlerken aynı anda
//     uygulama belgeler klasörüne WAV olarak kaydedilir (recordingOptions.persist).
//  2. Son metin chrono-node tabanlı Türkçe ayrıştırıcıya gönderilir: tarih / saat / eylem.
//  3. Eylem hedef günün sayfasına, ilgili saat çizgisine yazılır.
//  4. Girişe ses iğnesi (raptiye) iliştirilir; dokununca orijinal kayıt expo-audio ile çalar.
//
// Not: Android 12 ve altında tanıma sırasında kayıt desteklenmez; giriş sese bağlanmadan yazılır.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Group, Line, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { Directory, Paths } from 'expo-file-system';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { HANDWRITING_FONT, InkColors, NoteColors } from '../../constants/theme';
import { formatLong } from '../../services/calendar';
import { haptics } from '../../services/haptics';
import { parseEntry } from '../../services/nlp';
import { useAgenda } from '../../state/AgendaContext';

const SIZE = 44;

/** Skia ile çizilmiş krom ızgaralı eski tip stüdyo mikrofonu */
export function VintageMicIcon({ size = SIZE, recording = false }: { size?: number; recording?: boolean }) {
  const s = size / 44;
  const headX = 14 * s;
  const headW = 16 * s;
  const headY = 4 * s;
  const headH = 24 * s;
  const grille = Array.from({ length: 5 }, (_, i) => headY + (5 + i * 4) * s);
  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Ayak ve askı halkası */}
      <Line p1={vec(22 * s, 30 * s)} p2={vec(22 * s, 38 * s)} color="#5A5040" strokeWidth={2.5 * s} />
      <RoundedRect x={14 * s} y={37 * s} width={16 * s} height={4 * s} r={2 * s} color="#5A5040" />
      <RoundedRect x={11 * s} y={14 * s} width={22 * s} height={18 * s} r={11 * s} color="transparent" style="stroke" strokeWidth={2 * s}>
        <LinearGradient start={vec(11 * s, 0)} end={vec(33 * s, 0)} colors={['#8C7A5A', '#D9C7A0', '#8C7A5A']} />
      </RoundedRect>
      {/* Krom kapsül */}
      <RoundedRect x={headX} y={headY} width={headW} height={headH} r={8 * s}>
        <LinearGradient
          start={vec(headX, 0)}
          end={vec(headX + headW, 0)}
          colors={recording ? ['#7A1E1E', '#E57373', '#7A1E1E'] : ['#6E6E6E', '#F2F2F2', '#8A8A8A']}
        />
      </RoundedRect>
      <Group opacity={0.55}>
        {grille.map((y) => (
          <Line key={y} p1={vec(headX + 2 * s, y)} p2={vec(headX + headW - 2 * s, y)} color="#3A3A3A" strokeWidth={0.8 * s} />
        ))}
      </Group>
      {recording && <Circle cx={36 * s} cy={8 * s} r={3.5 * s} color="#E53935" />}
    </Canvas>
  );
}

let audioDir: Directory | null = null;
function voiceDirectory(): Directory {
  if (!audioDir) {
    audioDir = new Directory(Paths.document, 'voice-notes');
    if (!audioDir.exists) audioDir.create({ intermediates: true, idempotent: true });
  }
  return audioDir;
}

export default function VoiceNoteButton() {
  const { addEntry, goTo } = useAgenda();
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const finalText = useRef('');
  const transcriptRef = useRef('');
  const audioUri = useRef<string | null>(null);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (recording) pulse.value = withRepeat(withTiming(1.18, { duration: 600 }), -1, true);
    else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [recording, pulse]);

  const finalize = useCallback(async () => {
    const text = (finalText.current || transcriptRef.current).trim();
    const uri = audioUri.current;
    finalText.current = '';
    audioUri.current = null;
    transcriptRef.current = '';
    setTranscript('');
    if (!text) {
      haptics.warning();
      return;
    }
    const parsed = parseEntry(text, new Date(), 'tr');
    const entry = await addEntry({
      text: parsed.action || text,
      date: parsed.date,
      time: parsed.time,
      audioPath: uri,
    });
    if (!entry) return;
    if (entry.date) {
      goTo('day', entry.date);
      setToast(`${formatLong(entry.date)}${entry.time_slot ? ` · ${entry.time_slot}` : ''} sayfasına yazıldı`);
    } else {
      setToast('Tarih bulunamadı, Havuz’a eklendi');
    }
    setTimeout(() => setToast(null), 2600);
  }, [addEntry, goTo]);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    transcriptRef.current = text;
    setTranscript(text);
    if (e.isFinal) finalText.current = text;
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    audioUri.current = e.uri ?? null;
  });
  useSpeechRecognitionEvent('error', (e) => {
    console.warn('Ses tanıma hatası', e.error, e.message);
  });
  useSpeechRecognitionEvent('end', () => {
    setRecording(false);
    void finalize();
  });

  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setToast('Mikrofon / konuşma tanıma izni gerekli');
      setTimeout(() => setToast(null), 2600);
      return;
    }
    const canRecord = ExpoSpeechRecognitionModule.supportsRecording();
    finalText.current = '';
    audioUri.current = null;
    haptics.pickUp();
    setRecording(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'tr-TR',
      interimResults: true,
      continuous: false,
      addsPunctuation: false,
      contextualStrings: ['yarın', 'bugün', 'toplantı', 'saat'],
      recordingOptions: canRecord
        ? { persist: true, outputDirectory: voiceDirectory().uri, outputFileName: `not_${Date.now()}.wav` }
        : undefined,
    });
  }, []);

  const stop = useCallback(() => {
    haptics.drop();
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View>
      <Pressable
        onPress={recording ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Kaydı bitir' : 'Sesli not'}
        hitSlop={8}
      >
        <Animated.View style={[styles.button, recording && styles.recording, pulseStyle]}>
          <VintageMicIcon recording={recording} />
        </Animated.View>
      </Pressable>
      {(recording || toast) && (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.bubbleText}>{recording ? transcript || 'Dinliyorum…' : toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE + 8,
    height: SIZE + 8,
    borderRadius: (SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 246, 236, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  recording: { backgroundColor: '#FBE3E1', borderColor: NoteColors.pin },
  bubble: {
    position: 'absolute',
    top: SIZE + 14,
    right: 0,
    width: 260,
    padding: 10,
    backgroundColor: NoteColors.postit,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
  bubbleText: { fontFamily: HANDWRITING_FONT, fontSize: 20, color: InkColors.midnight },
});
