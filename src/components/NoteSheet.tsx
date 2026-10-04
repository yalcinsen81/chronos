// Not ayrıntı penceresi: notun kartını (NoteEditor) ekranın ortasında açar.

import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Space, usePalette } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import NoteEditor from './NoteEditor';

export default function NoteSheet({ note, onClose }: { note: EntryWithDate | null; onClose: () => void }) {
  const c = usePalette();
  return (
    <Modal visible={note !== null} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View>{note && <NoteEditor key={note.id} note={note} onClose={onClose} />}</View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Space.lg },
  sheet: { width: '100%', maxWidth: 560 },
});
