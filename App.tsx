import { useMemo } from 'react';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AgendaScreen from './src/components/AgendaScreen';
import { usePalette } from './src/constants/theme';
import { createSqliteDriver } from './src/db/sqliteDriver';
import { AgendaProvider, useAgenda } from './src/state/AgendaContext';

// Uygulama kökü: güvenli alan, yazı tipleri ve yerel veri tabanı burada kurulur.
export default function App() {
  const driver = useMemo(() => createSqliteDriver(), []);
  return (
    <SafeAreaProvider>
      <AgendaProvider driver={driver}>
        <Root />
      </AgendaProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

function Root() {
  const c = usePalette();
  const { ready } = useAgenda();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!ready || !fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <AgendaScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
