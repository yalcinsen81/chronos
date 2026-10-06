// İlk açılışta bir kez görünen kısa karşılama; "Anladım" ile kalıcı olarak kapanır.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { useAgenda } from '../state/AgendaContext';

const TIPS = [
  'Bir günün "+ Not ekle" satırına dokun, yaz, Enter.',
  '"yarın 15:00 diş hekimi" ya da "14:00-15:30 toplantı" yazarsan gün ve saati kendisi bulur.',
  'Nota uzun bas: tamamla, taşı, sil, birden çok not seç.',
];

export default function OnboardingCard() {
  const c = usePalette();
  const { onboarded, finishOnboarding } = useAgenda();
  if (onboarded) return null;
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={[styles.card, { backgroundColor: c.accentSoft, borderColor: c.separator }]}
    >
      <Text style={[Type.title, { color: c.text }]}>Hoş geldin</Text>
      <View style={styles.tips}>
        {TIPS.map((t, i) => (
          <Text key={t} style={[Type.sub, { color: c.text }]}>
            {i + 1}. {t}
          </Text>
        ))}
      </View>
      <Pressable
        onPress={finishOnboarding}
        accessibilityRole="button"
        accessibilityLabel="Anladım"
        style={({ pressed }) => [styles.btn, { backgroundColor: c.accent }, pressed && { opacity: 0.7 }]}
      >
        <Text style={[Type.caption, { color: c.onAccent }]}>Anladım</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Space.lg,
    marginTop: Space.sm,
    padding: Space.lg,
    gap: Space.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tips: { gap: 4 },
  btn: {
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
});
