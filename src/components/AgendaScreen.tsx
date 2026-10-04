// Ana panel. Telefonda: selam başlığı, özet kartı, takvim, yeni not kartı ve notlar tek kaydırmada.
// Tablette: solda özet + aylık takvim, sağda yeni not kartı ve notlar.

import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Space, usePalette, WIDE_BREAKPOINT } from '../constants/theme';
import type { EntryWithDate } from '../db/repository';
import { fromISODate, todayISO, TR_MONTHS, formatWeekday } from '../services/calendar';
import { useAgenda } from '../state/AgendaContext';
import CalendarCard, { IconButton } from './CalendarCard';
import Composer from './Composer';
import NoteCard from './NoteCard';
import { EmptyNotes, NotesHeader, type NoteFilter } from './NotesSection';
import SummaryCard from './SummaryCard';

function greeting(h = new Date().getHours()): string {
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function TopBar() {
  const c = usePalette();
  const { date, selectDate } = useAgenda();
  const today = todayISO();
  const t = fromISODate(today);
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={[styles.topDate, { color: c.textMuted }]}>
          {formatWeekday(today)}, {t.getDate()} {TR_MONTHS[t.getMonth()]}
        </Text>
        <Text style={[styles.greet, { color: c.text }]}>{greeting()}</Text>
      </View>
      {date !== today && <IconButton icon="today-outline" label="Bugüne dön" onPress={() => selectDate(today)} active />}
    </View>
  );
}

export default function AgendaScreen() {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const { notes } = useAgenda();
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const composerRef = useRef<TextInput>(null);

  const counts = useMemo(
    () => ({
      all: notes.length,
      open: notes.filter((n) => !n.is_completed).length,
      done: notes.filter((n) => n.is_completed).length,
    }),
    [notes],
  );
  const visible = useMemo(
    () => notes.filter((n) => (filter === 'all' ? true : filter === 'done' ? n.is_completed : !n.is_completed)),
    [notes, filter],
  );

  const renderNote = ({ item }: { item: EntryWithDate }) => (
    <NoteCard
      note={item}
      editing={editingId === item.id}
      onEdit={() => setEditingId(item.id)}
      onEndEdit={() => setEditingId(null)}
    />
  );

  const list = (header?: React.ReactElement) => (
    <FlatList
      data={visible}
      keyExtractor={(n) => n.id}
      renderItem={renderNote}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {header}
          <Composer ref={composerRef} />
          <NotesHeader filter={filter} onFilter={setFilter} counts={counts} />
        </View>
      }
      ListEmptyComponent={
        <EmptyNotes filtered={filter !== 'all' && notes.length > 0} onWrite={() => composerRef.current?.focus()} />
      }
      ItemSeparatorComponent={() => <View style={{ height: Space.sm + 2 }} />}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {wide ? (
          <View style={styles.wide}>
            <ScrollView style={styles.side} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
              <TopBar />
              <SummaryCard />
              <CalendarCard alwaysMonth />
            </ScrollView>
            <View style={styles.main}>{list()}</View>
          </View>
        ) : (
          <View style={styles.root}>
            {list(
              <>
                <TopBar />
                <SummaryCard />
                <CalendarCard />
              </>,
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.sm },
  topDate: { fontFamily: Fonts.medium, fontSize: 13 },
  greet: { fontFamily: Fonts.extrabold, fontSize: 26, letterSpacing: -0.6 },
  listHeader: { gap: Space.lg, paddingBottom: Space.md },
  listContent: { paddingHorizontal: Space.lg, paddingBottom: 48 },
  wide: { flex: 1, flexDirection: 'row', paddingHorizontal: Space.md, gap: Space.md },
  side: { width: 400, flexGrow: 0 },
  sideContent: { gap: Space.lg, paddingHorizontal: Space.sm, paddingBottom: Space.xl },
  main: { flex: 1, maxWidth: 760, paddingTop: Space.lg },
});
