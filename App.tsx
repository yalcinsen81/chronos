import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AgendaScreen from './src/components/AgendaScreen';
import { SERIF_FONT, usePalette } from './src/constants/theme';
import { createSqliteDriver } from './src/db/sqliteDriver';
import { AgendaProvider, useAgenda } from './src/state/AgendaContext';

// Uygulama kökü: güvenli alan, ikon fontu ve yerel veri tabanı burada kurulur.
export default function App() {
  const driver = useMemo(() => createSqliteDriver(), []);
  return (
    <SafeAreaProvider>
      <AgendaProvider driver={driver}>
        <Root />
      </AgendaProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const c = usePalette();
  const { ready } = useAgenda();
  // Durum çubuğu elle seçilen görünüme uyar (sistem temasını beklemez)
  const statusBar = <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />;
  // Yazı tipleri yüklenmeden çizilirse ikonlar bir an boş kutu, başlıklar yedek yazı tipiyle görünür
  const [fontsLoaded, fontError] = useFonts({ ...Ionicons.font, [SERIF_FONT]: Fraunces_600SemiBold });
  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bg }]}>
        {statusBar}
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return (
    <>
      {statusBar}
      <AgendaScreen />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
