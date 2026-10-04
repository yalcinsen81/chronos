// Ayarlar: vurgu rengi seçimi ve yedekleme (kopyala / paylaş / geri yükle).
// Veriler yalnızca bu cihazdadır; yedek, notların düz metin (JSON) halidir.

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ACCENT_KEYS, AccentThemes, paletteFor, Radius, Space, Type, usePalette } from '../constants/theme';
import { useAgenda } from '../state/AgendaContext';
import { webNoOutline } from './webStyles';

export default function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = usePalette();
  const { accent, setAccent, exportBackup, importBackup } = useAgenda();
  const [backupText, setBackupText] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const copy = async () => {
    const json = await exportBackup();
    setBackupText(json);
    try {
      await Clipboard.setStringAsync(json);
      setStatus({ text: 'Yedek panoya kopyalandı. Bir yere yapıştırıp sakla.' });
    } catch {
      setStatus({ text: 'Panoya kopyalanamadı; aşağıdaki metni elle seçip kopyala.', error: true });
    }
  };

  const share = async () => {
    const json = await exportBackup();
    setBackupText(json);
    try {
      await Share.share({ message: json, title: 'Chronos yedeği' });
    } catch {
      setStatus({ text: 'Paylaşım açılamadı.', error: true });
    }
  };

  const restore = async () => {
    const res = await importBackup(restoreText);
    if ('error' in res) setStatus({ text: res.error, error: true });
    else {
      setStatus({ text: res.added ? `${res.added} not geri yüklendi.` : 'Yedekteki notların hepsi zaten var.' });
      setRestoreText('');
      setRestoreOpen(false);
    }
  };

  const paste = async () => {
    try {
      setRestoreText(await Clipboard.getStringAsync());
    } catch {
      setStatus({ text: 'Panodan okunamadı; metni elle yapıştır.', error: true });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={styles.head}>
            <Ionicons name="settings-outline" size={20} color={c.accent} />
            <Text style={[Type.title, { color: c.text, flex: 1 }]}>Ayarlar</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>RENK</Text>
            <View style={styles.swatches}>
              {ACCENT_KEYS.map((k) => {
                const active = accent === k;
                const col = paletteFor(c.scheme, k).accent;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setAccent(k)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${AccentThemes[k].label} tema`}
                    style={styles.swatchWrap}
                  >
                    <View style={[styles.ring, active && { borderColor: col }]}>
                      <View style={[styles.swatch, { backgroundColor: col }]}>
                        {active && <Ionicons name="checkmark" size={18} color={c.onAccent} />}
                      </View>
                    </View>
                    <Text style={[Type.micro, { color: active ? c.text : c.textMuted }]}>{AccentThemes[k].label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>YEDEK</Text>
            <Text style={[Type.caption, styles.note, { color: c.textMuted }]}>
              Notların yalnızca bu cihazda durur. Yedeği kopyalayıp bir yere (not uygulaması, e-posta) yapıştırarak
              sakla; gerekirse buradan geri yükle.
            </Text>
            <View style={styles.btnRow}>
              <Pill icon="copy-outline" label="Yedeği kopyala" onPress={copy} />
              {Platform.OS !== 'web' && <Pill icon="share-outline" label="Paylaş" onPress={share} />}
              <Pill
                icon="download-outline"
                label="Geri yükle"
                onPress={() => setRestoreOpen((v) => !v)}
                active={restoreOpen}
              />
            </View>

            {backupText !== '' && (
              <Animated.View entering={FadeInDown.duration(160)}>
                <TextInput
                  value={backupText}
                  editable={false}
                  multiline
                  selectTextOnFocus
                  style={[Type.caption, styles.area, webNoOutline, { color: c.textMuted, backgroundColor: c.fill }]}
                  accessibilityLabel="Yedek metni"
                />
              </Animated.View>
            )}

            {restoreOpen && (
              <Animated.View entering={FadeInDown.duration(160)} style={styles.restore}>
                <TextInput
                  value={restoreText}
                  onChangeText={setRestoreText}
                  multiline
                  placeholder="Yedek metnini buraya yapıştır"
                  placeholderTextColor={c.textFaint}
                  style={[Type.caption, styles.area, webNoOutline, { color: c.text, backgroundColor: c.fill }]}
                  accessibilityLabel="Geri yüklenecek yedek"
                />
                <View style={styles.btnRow}>
                  <Pill icon="clipboard-outline" label="Panodan yapıştır" onPress={paste} />
                  <Pill icon="checkmark" label="Geri yükle" onPress={restore} primary disabled={!restoreText.trim()} />
                </View>
              </Animated.View>
            )}

            {status && (
              <Text style={[Type.caption, styles.status, { color: status.error ? c.danger : c.accent }]}>
                {status.text}
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Pill({
  icon,
  label,
  onPress,
  active,
  primary,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  const c = usePalette();
  const bg = primary ? c.accent : active ? c.accentSoft : c.fill;
  const fg = primary ? c.onAccent : active ? c.accent : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={[Type.caption, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  body: { paddingHorizontal: Space.lg, paddingBottom: Space.lg, gap: Space.sm },
  section: { marginTop: Space.md, letterSpacing: 0.8 },
  note: { fontWeight: '400', lineHeight: 18 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Space.xs },
  swatchWrap: { alignItems: 'center', gap: 6 },
  ring: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Space.md,
    borderRadius: Radius.pill,
  },
  area: { minHeight: 110, maxHeight: 200, borderRadius: Radius.md, padding: Space.md, textAlignVertical: 'top' },
  restore: { gap: Space.sm },
  status: { marginTop: Space.xs, fontWeight: '500' },
});
