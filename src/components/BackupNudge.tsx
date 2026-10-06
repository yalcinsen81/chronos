// Haftalık yedek hatırlatması: veri yalnızca cihazda olduğu için ince bir şerit olarak görünür.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { useAgenda } from '../state/AgendaContext';
import { saveBackupFile } from './saveBackup';

export default function BackupNudge() {
  const c = usePalette();
  const { backupDue, exportBackup, markBackedUp, snoozeBackup } = useAgenda();
  if (!backupDue) return null;
  const backUp = async () => {
    try {
      await saveBackupFile(await exportBackup());
      await markBackedUp();
    } catch {
      // Paylaşım iptal edildiyse şerit kalır
    }
  };
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      style={[styles.bar, { backgroundColor: c.accentSoft, borderColor: c.separator }]}
    >
      <Text style={[Type.caption, styles.text, { color: c.text }]}>Notların yalnızca bu cihazda. Yedek alalım mı?</Text>
      <View style={styles.actions}>
        <Pressable onPress={snoozeBackup} hitSlop={6} accessibilityRole="button" accessibilityLabel="Sonra">
          <Text style={[Type.caption, { color: c.textMuted }]}>Sonra</Text>
        </Pressable>
        <Pressable
          onPress={backUp}
          accessibilityRole="button"
          accessibilityLabel="Yedek al"
          style={({ pressed }) => [styles.btn, { backgroundColor: c.accent }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[Type.caption, { color: c.onAccent }]}>Yedek al</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Space.sm,
    marginHorizontal: Space.lg,
    marginTop: Space.sm,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 180 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  btn: { height: 30, paddingHorizontal: Space.md, borderRadius: Radius.pill, justifyContent: 'center' },
});
