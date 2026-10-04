import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AgendaScreen from './src/components/AgendaScreen';
import { usePalette } from './src/constants/theme';
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
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

function Root() {
  const c = usePalette();
  const { ready } = useAgenda();
  // İkon fontu yüklenmeden çizilirse ikonlar bir an boş kutu görünür
  const [fontsLoaded] = useFonts(Ionicons.font);
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
