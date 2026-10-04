import { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Caveat_500Medium, Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CoverIntro from './src/components/notebook/CoverIntro';
import NotebookShell from './src/components/notebook/NotebookShell';
import { PaperColors } from './src/constants/theme';
import { createOpSqliteDriver } from './src/db/opSqliteDriver';
import { AgendaProvider } from './src/state/AgendaContext';

// Uygulama kökü: jest kökü, güvenli alan, veri tabanı ve el yazısı fontları burada kurulur.
export default function App() {
  const [fontsLoaded] = useFonts({ Caveat_500Medium, Caveat_700Bold });
  const driver = useMemo(() => createOpSqliteDriver(), []);
  const [coverOpen, setCoverOpen] = useState(false);
  const onOpened = useCallback(() => setCoverOpen(true), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {fontsLoaded ? (
          <AgendaProvider driver={driver}>
            <NotebookShell />
            {!coverOpen && <CoverIntro onOpened={onOpened} />}
          </AgendaProvider>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="#1B2A4A" />
          </View>
        )}
        <StatusBar style={coverOpen ? 'dark' : 'light'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PaperColors.ivory },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
