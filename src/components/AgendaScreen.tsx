// Ana ekran: telefonda takvim üstte, notlar altta; tablette yan yana.

import { KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import CalendarView from './CalendarView';
import NotesPanel from './NotesPanel';

export default function AgendaScreen() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.root, wide && styles.wide]}>
          <View
            style={[
              wide ? styles.sideCalendar : styles.topCalendar,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <CalendarView />
          </View>
          <View style={[styles.root, wide && styles.notesWide]}>
            <NotesPanel />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wide: { flexDirection: 'row', padding: 16, gap: 16 },
  topCalendar: { borderBottomWidth: StyleSheet.hairlineWidth },
  sideCalendar: { width: 380, alignSelf: 'flex-start', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  notesWide: { maxWidth: 720 },
});
