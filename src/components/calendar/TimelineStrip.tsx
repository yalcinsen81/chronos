// Zaman Tüneli Şeridi: ekranın altında yatay kaydırılan lineer gün cetveli.
// Ay başlarında ay adı görünür; dokunulan güne atlanır. Günler aynı zamanda bırakma alanıdır.

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';

import { HANDWRITING_FONT, InkColors } from '../../constants/theme';
import {
  diffDays,
  fromISODate,
  getTimelineDays,
  todayISO,
  TR_MONTHS_SHORT,
  TR_WEEKDAYS_SHORT,
  weekdayIndex,
  type ISODate,
} from '../../services/calendar';
import { haptics } from '../../services/haptics';
import { useAgenda } from '../../state/AgendaContext';
import { DropZone } from '../dnd/DragContext';

const ITEM_W = 46;
const RANGE = 400; // bugünün iki yanında gün sayısı

const DayTick = memo(function DayTick({
  iso,
  selected,
  isToday,
  onPress,
}: {
  iso: ISODate;
  selected: boolean;
  isToday: boolean;
  onPress: (iso: ISODate) => void;
}) {
  const d = fromISODate(iso);
  const firstOfMonth = d.getDate() === 1;
  const wd = weekdayIndex(iso);
  return (
    <DropZone date={iso} style={styles.item}>
      <Pressable style={styles.itemInner} onPress={() => onPress(iso)}>
        <Text style={[styles.month, !firstOfMonth && styles.hidden]}>{TR_MONTHS_SHORT[d.getMonth()]}</Text>
        <View style={[styles.tick, firstOfMonth && styles.tickMonth, wd === 0 && styles.tickWeek]} />
        <Text style={[styles.weekday, wd >= 5 && styles.weekend]}>{TR_WEEKDAYS_SHORT[wd][0]}</Text>
        <View style={[styles.dayWrap, selected && styles.selected, isToday && !selected && styles.today]}>
          <Text style={[styles.day, selected && styles.selectedText]}>{d.getDate()}</Text>
        </View>
      </Pressable>
    </DropZone>
  );
});

export default function TimelineStrip() {
  const { date, goTo } = useAgenda();
  const listRef = useRef<FlatList<ISODate>>(null);
  const today = todayISO();
  const days = useMemo(() => getTimelineDays(today, RANGE, RANGE), [today]);
  const selectedIndex = Math.max(0, Math.min(days.length - 1, RANGE + diffDays(today, date)));

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: selectedIndex, viewPosition: 0.5, animated: true });
  }, [selectedIndex]);

  const onPress = useCallback(
    (iso: ISODate) => {
      haptics.toolChange();
      goTo('day', iso);
    },
    [goTo],
  );

  const renderItem: ListRenderItem<ISODate> = ({ item }) => (
    <DayTick iso={item} selected={item === date} isToday={item === today} onPress={onPress} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        horizontal
        data={days}
        keyExtractor={(d) => d}
        renderItem={renderItem}
        extraData={date}
        initialScrollIndex={selectedIndex}
        getItemLayout={(_, index) => ({ length: ITEM_W, offset: ITEM_W * index, index })}
        showsHorizontalScrollIndicator={false}
        windowSize={7}
        initialNumToRender={20}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 78,
    backgroundColor: 'rgba(239, 230, 210, 0.96)',
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  item: { width: ITEM_W },
  itemInner: { flex: 1, alignItems: 'center', paddingTop: 4 },
  month: { fontSize: 10, fontWeight: '700', color: InkColors.red, height: 13 },
  hidden: { opacity: 0 },
  tick: { width: 1, height: 6, backgroundColor: '#9A8F78' },
  tickWeek: { height: 10 },
  tickMonth: { height: 12, width: 2, backgroundColor: InkColors.red },
  weekday: { fontSize: 10, color: '#7A6F5A', marginTop: 2 },
  weekend: { color: '#B07A6A' },
  dayWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: HANDWRITING_FONT, fontSize: 19, color: InkColors.black },
  selected: { backgroundColor: InkColors.midnight },
  selectedText: { color: '#FFF' },
  today: { borderWidth: 1.5, borderColor: InkColors.red },
});
