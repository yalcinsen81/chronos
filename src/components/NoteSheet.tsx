// Not ayrıntı penceresi: notun kartını (NoteEditor) açar.
// Geniş ekranda ortada kart; telefonda alttan yükselen bir sayfa (tutamaçtan aşağı çekince kapanır).
// Satırdaki zile dokunulduysa kart alarm seçenekleri açık gelir.

import { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Space, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import type { ISODate } from '../services/calendar';
import NoteEditor from './NoteEditor';

/** Gün çizelgesinde bir saate dokunulunca (ya da + düğmesiyle) açılan yeni not */
export interface NoteDraft {
  date: ISODate;
  time: string | null;
}

const CLOSE_DRAG = 90; // bu kadar aşağı çekilirse kapanır

export default function NoteSheet({
  note,
  draft = null,
  alarm = false,
  onClose,
}: {
  note: EntryWithDate | null;
  draft?: NoteDraft | null;
  alarm?: boolean; // true ise kart alarm seçenekleri açık başlar
  onClose: () => void;
}) {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const phone = width < WIDE_BREAKPOINT;

  // Tutamaçtan aşağı sürükleme: sayfa parmakla iner, yeterince inerse kapanır, yoksa yerine yaylanır
  const dy = useSharedValue(0);
  const close = useRef(onClose);
  close.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        dy.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DRAG || g.vy > 0.9) {
          dy.value = 0;
          close.current();
        } else {
          dy.value = withSpring(0, { damping: 18, stiffness: 220 });
        }
      },
    }),
  ).current;
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dy.value }] }));

  const editor = note ? (
    <NoteEditor key={note.id} note={note} startWithAlarm={alarm} onClose={onClose} />
  ) : (
    draft && <NoteEditor key="new" newDate={draft.date} initialTime={draft.time} onClose={onClose} />
  );

  return (
    <Modal
      visible={note !== null || draft !== null}
      transparent
      animationType={phone ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View entering={phone ? FadeIn.duration(180) : undefined} style={styles.flex}>
          <Pressable
            style={[styles.backdrop, phone && styles.backdropPhone, { backgroundColor: c.shadow }]}
            onPress={onClose}
          >
            <Animated.View
              entering={phone ? SlideInDown.duration(240) : undefined}
              style={[styles.sheet, phone && { paddingBottom: Math.max(insets.bottom, Space.sm) }, phone && dragStyle]}
            >
              {phone && (
                <View {...pan.panHandlers} style={styles.grab} accessibilityLabel="Aşağı çekerek kapat">
                  <View style={[styles.grabBar, { backgroundColor: c.card }]} />
                </View>
              )}
              <Pressable onPress={() => undefined}>
                <View>{editor}</View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Space.lg },
  backdropPhone: { justifyContent: 'flex-end', padding: Space.sm },
  sheet: { width: '100%', maxWidth: 560 },
  grab: { height: 28, alignItems: 'center', justifyContent: 'center' },
  grabBar: { width: 44, height: 5, borderRadius: 3, opacity: 0.9 },
});
