// Havuz (Inbox) → takvim günü sürükle-bırak altyapısı.
//
// - Bırakma alanları (DropZone) kendilerini kaydeder; sürükleme başladığında hepsi ölçülür ve
//   dikdörtgenleri bir shared value'ya yazılır.
// - Hayalet Post-it ve üzerinde gezinilen alanın tespiti tamamen UI iş parçacığında yapılır.
// - Yalnızca bırakma anında JS'e dönülür.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View, type ViewProps, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HANDWRITING_FONT, NoteColors } from '../../constants/theme';
import type { EntryWithDate } from '../../db/repository';
import type { ISODate } from '../../services/calendar';
import { haptics } from '../../services/haptics';

interface ZoneRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ZoneInfo {
  ref: React.RefObject<View | null>;
  date: ISODate;
  time?: string | null;
}

export type DropHandler = (entry: EntryWithDate, date: ISODate, time?: string | null) => void;

interface DragState {
  register: (id: string, info: ZoneInfo) => () => void;
  hoveredId: SharedValue<string>;
  dragging: EntryWithDate | null;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  zones: SharedValue<ZoneRect[]>;
  begin: (entry: EntryWithDate) => void;
  end: (zoneId: string) => void;
}

const DragContext = createContext<DragState | null>(null);

const GHOST_W = 180;
const GHOST_H = 72;

export function DragProvider({ onDrop, children }: { onDrop: DropHandler; children: ReactNode }) {
  const registry = useRef(new Map<string, ZoneInfo>());
  const zones = useSharedValue<ZoneRect[]>([]);
  const hoveredId = useSharedValue('');
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const [dragging, setDragging] = useState<EntryWithDate | null>(null);
  const draggingRef = useRef<EntryWithDate | null>(null);

  const register = useCallback((id: string, info: ZoneInfo) => {
    registry.current.set(id, info);
    return () => {
      registry.current.delete(id);
    };
  }, []);

  const measureAll = useCallback(() => {
    const rects: ZoneRect[] = [];
    const entries = [...registry.current.entries()];
    let pending = entries.length;
    if (pending === 0) zones.value = [];
    for (const [id, info] of entries) {
      const node = info.ref.current;
      if (!node) {
        if (--pending === 0) zones.value = rects;
        continue;
      }
      node.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) rects.push({ id, x, y, w, h });
        if (--pending === 0) {
          // Saat çizgileri gün hücresinin içinde olabilir: küçük alanlar önce denenir
          rects.sort((a, b) => a.w * a.h - b.w * b.h);
          zones.value = rects;
        }
      });
    }
  }, [zones]);

  const begin = useCallback(
    (entry: EntryWithDate) => {
      draggingRef.current = entry;
      setDragging(entry);
      haptics.pickUp();
      measureAll();
    },
    [measureAll],
  );

  const end = useCallback(
    (zoneId: string) => {
      const entry = draggingRef.current;
      draggingRef.current = null;
      setDragging(null);
      zones.value = [];
      const zone = zoneId ? registry.current.get(zoneId) : undefined;
      if (entry && zone) onDrop(entry, zone.date, zone.time);
    },
    [onDrop, zones],
  );

  const value = useMemo(
    () => ({ register, hoveredId, dragging, ghostX, ghostY, zones, begin, end }),
    [register, hoveredId, dragging, ghostX, ghostY, zones, begin, end],
  );

  return (
    <DragContext.Provider value={value}>
      {children}
      <DragGhost />
    </DragContext.Provider>
  );
}

function useDrag(): DragState {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDrag, DragProvider içinde kullanılmalı');
  return ctx;
}

/** Parmağı takip eden hafif eğik Post-it */
function DragGhost() {
  const { dragging, ghostX, ghostY } = useDrag();
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value - GHOST_W / 2 },
      { translateY: ghostY.value - GHOST_H / 2 },
      { rotate: '-4deg' },
      { scale: 1.05 },
    ],
  }));
  if (!dragging) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.ghost, style]}>
      <Text style={styles.ghostText} numberOfLines={2}>
        {dragging.text_content}
      </Text>
    </Animated.View>
  );
}

/** Uzun basılınca kaldırılıp sürüklenebilen giriş sarmalayıcısı */
export function Draggable({ entry, children, onLift }: { entry: EntryWithDate; children: ReactNode; onLift?: () => void }) {
  const { begin, end, ghostX, ghostY, zones, hoveredId } = useDrag();

  const lift = useCallback(() => {
    begin(entry);
    onLift?.();
  }, [begin, entry, onLift]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .onStart((e) => {
          ghostX.value = e.absoluteX;
          ghostY.value = e.absoluteY;
          hoveredId.value = '';
          scheduleOnRN(lift);
        })
        .onUpdate((e) => {
          ghostX.value = e.absoluteX;
          ghostY.value = e.absoluteY;
          let hit = '';
          const list = zones.value;
          for (let i = 0; i < list.length; i++) {
            const z = list[i];
            if (e.absoluteX >= z.x && e.absoluteX <= z.x + z.w && e.absoluteY >= z.y && e.absoluteY <= z.y + z.h) {
              hit = z.id;
              break;
            }
          }
          hoveredId.value = hit;
        })
        .onEnd(() => {
          scheduleOnRN(end, hoveredId.value);
          hoveredId.value = '';
        })
        .onFinalize((_e, success) => {
          // İptal edilen sürüklemede (ör. sistem jesti) durum temizlenir
          if (!success) scheduleOnRN(end, '');
        }),
    [lift, end, ghostX, ghostY, zones, hoveredId],
  );

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}

let zoneCounter = 0;

/** Üzerine Post-it bırakılabilen alan (takvim günü, saat çizgisi, zaman şeridi günü) */
export function DropZone({
  date,
  time,
  style,
  hoverStyle,
  children,
  ...rest
}: ViewProps & { date: ISODate; time?: string | null; hoverStyle?: ViewStyle }) {
  const { register, hoveredId } = useDrag();
  const ref = useRef<View>(null);
  const id = useMemo(() => `zone-${++zoneCounter}`, []);

  useEffect(() => register(id, { ref, date, time }), [register, id, date, time]);

  const animated = useAnimatedStyle(() => {
    const active = hoveredId.value === id;
    return {
      backgroundColor: active ? 'rgba(255, 214, 90, 0.35)' : 'transparent',
      transform: [{ scale: withSpring(active ? 1.04 : 1, { damping: 14 }) }],
    };
  });

  return (
    <View ref={ref} collapsable={false} style={style} {...rest}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.zoneHighlight, hoverStyle, animated]} />
      {children}
    </View>
  );
}

export function useIsDragging(): boolean {
  return useDrag().dragging !== null;
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: GHOST_W,
    minHeight: GHOST_H,
    padding: 10,
    backgroundColor: NoteColors.postit,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    zIndex: 1000,
  },
  ghostText: { fontFamily: HANDWRITING_FONT, fontSize: 20, color: '#3A3220' },
  zoneHighlight: { borderRadius: 6 },
});
