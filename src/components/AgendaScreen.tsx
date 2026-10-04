// Ana ekran (Things 3 düzeni). Telefonda: takvim şeridi, büyük gün başlığı, not listesi,
// tamamlananlar bölümü ve sağ altta yüzen "+" düğmesi. Tablette: solda kenar çubuğunda aylık takvim.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, Type, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { todayISO } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import CalendarView from './CalendarView';
import DayHeader from './DayHeader';
import NoteEditor from './NoteEditor';
import NoteRow from './NoteRow';

type Editing = null | 'new' | string;

export default function AgendaScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const { notes, date, selectDate } = useAgenda();
  const [editing, setEditing] = useState<Editing>(null);
  const [showDone, setShowDone] = useState(false);

  // Gün değişince açık düzenleyici kapanır
  useEffect(() => setEditing(null), [date]);

  const open = useMemo(() => notes.filter((n) => !n.is_completed), [notes]);
  const done = useMemo(() => notes.filter((n) => n.is_completed), [notes]);
  const rows = showDone ? [...open, ...done] : open;

  const renderItem = ({ item, index }: { item: EntryWithDate; index: number }) => (
    <>
      {showDone && index === open.length && <DoneToggle count={done.length} shown onPress={() => setShowDone(false)} />}
      {editing === item.id ? (
        <NoteEditor note={item} onClose={() => setEditing(null)} />
      ) : (
        <NoteRow note={item} onOpen={() => setEditing(item.id)} />
      )}
    </>
  );

  const header = (
    <View>
      {!wide && (
        <View style={[styles.calendarBar, { borderBottomColor: c.separator }]}>
          <CalendarView />
        </View>
      )}
      <View style={styles.pad}>
        <DayHeader date={date} open={open.length} />
        {editing === 'new' && <NoteEditor onClose={() => setEditing(null)} />}
      </View>
    </View>
  );

  const footer = (
    <View style={styles.pad}>
      {notes.length === 0 && editing !== 'new' && <Empty />}
      {done.length > 0 && !showDone && <DoneToggle count={done.length} shown={false} onPress={() => setShowDone(true)} />}
    </View>
  );

  const list = (
    <FlatList
      data={rows}
      keyExtractor={(n) => n.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      style={styles.flex}
      // Satırlar içerik genişliğinde, kenarlardan içeride
      CellRendererComponent={({ children, style, ...rest }) => (
        <View style={[style, styles.pad]} {...rest}>
          {children}
        </View>
      )}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );

  const today = todayISO();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: wide ? c.sidebar : c.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {wide ? (
          <View style={[styles.flex, styles.split]}>
            <View style={styles.sidebar}>
              <Text style={[Type.title, styles.brand, { color: c.text }]}>Chronos</Text>
              <CalendarView alwaysMonth />
              {date !== today && (
                <Pressable onPress={() => selectDate(today)} style={({ pressed }) => [styles.todayLink, pressed && { backgroundColor: c.fill }]}>
                  <Ionicons name="star" size={16} color={c.star} />
                  <Text style={[Type.sub, { color: c.text, fontWeight: '600' }]}>Bugüne dön</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.content, { backgroundColor: c.bg, borderLeftColor: c.separator }]}>
              <View style={styles.contentInner}>{list}</View>
            </View>
          </View>
        ) : (
          <View style={[styles.flex, { backgroundColor: c.bg }]}>{list}</View>
        )}

        {editing === null && (
          <Animated.View
            entering={ZoomIn.duration(180)}
            exiting={ZoomOut.duration(120)}
            style={[styles.fabWrap, { bottom: Space.xl + insets.bottom }]}
          >
            <Pressable
              onPress={() => setEditing('new')}
              accessibilityRole="button"
              accessibilityLabel="Yeni not"
              style={({ pressed }) => [
                styles.fab,
                { backgroundColor: c.accent, shadowColor: c.accent, transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Ionicons name="add" size={32} color={c.onAccent} />
            </Pressable>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DoneToggle({ count, shown, onPress }: { count: number; shown: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} style={styles.doneToggle} accessibilityRole="button">
      <Text style={[Type.caption, { color: c.textMuted }]}>
        {shown ? 'Tamamlananları gizle' : `${count} tamamlanan notu göster`}
      </Text>
    </Pressable>
  );
}

function Empty() {
  const c = usePalette();
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(100)} style={styles.empty}>
      <Ionicons name="document-text-outline" size={44} color={c.separator} />
      <Text style={[Type.sub, { color: c.textFaint }]}>Not yok</Text>
      <Text style={[Type.caption, { color: c.textFaint, fontWeight: '400' }]}>Eklemek için + düğmesine dokun</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: Space.lg },
  calendarBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  split: { flexDirection: 'row' },
  sidebar: { width: 340, paddingTop: Space.lg, paddingHorizontal: Space.sm, gap: Space.sm },
  brand: { paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  todayLink: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginHorizontal: Space.md, padding: Space.md, borderRadius: Radius.md },
  content: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  contentInner: { flex: 1, width: '100%', maxWidth: 720, paddingHorizontal: Space.xl },
  doneToggle: { alignSelf: 'flex-start', paddingVertical: Space.md, paddingHorizontal: Space.sm },
  empty: { alignItems: 'center', gap: 6, paddingTop: 56 },
  fabWrap: { position: 'absolute', right: Space.xl },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
