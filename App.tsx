import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import NotebookPage from './src/components/canvas/NotebookPage';

// Uygulama kökü: jestlerin çalışması için tüm ağaç GestureHandlerRootView ile sarılır.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NotebookPage />
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
