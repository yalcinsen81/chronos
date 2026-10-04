// Mürekkep motoru: perfect-freehand ile basınca duyarlı vuruş dış hattı üretir ve Skia'da çizer.
//
// Performans tasarımı:
// - Tamamlanmış vuruşlar tek bir SkPicture'a kaydedilir; yeni vuruş eklenene kadar yeniden çizilmez.
// - Canlı (aktif) vuruş bir Reanimated shared value'da tutulur; React yeniden render edilmeden
//   Skia tarafından doğrudan güncellenir.
// - perfect-freehand bir worklet olmadığı için dış hat JS iş parçacığında hesaplanır; yalnızca
//   aktif vuruş yeniden hesaplanır (O(n) / hareket olayı).

import { memo, useCallback, useMemo, useRef } from 'react';
import { createPicture, Path, Picture, Skia, type SkPath } from '@shopify/react-native-skia';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { getStroke } from 'perfect-freehand';

import { DEFAULT_PEN } from '../../constants/theme';
import type { StrokePoint } from '../../types/models';

export interface InkStroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
}

const NEUTRAL_PRESSURE = 0.5;

/** Noktalarda gerçek kalem basıncı var mı? (Parmakla çizimde tüm basınçlar nötrdür.) */
export function hasRealPressure(points: StrokePoint[]): boolean {
  return points.some((p) => p[2] !== NEUTRAL_PRESSURE);
}

/** perfect-freehand dış hat noktalarından kapalı, köşesiz bir Skia yolu üretir. */
export function outlineToPath(outline: number[][]): SkPath | null {
  if (outline.length < 2) return null;
  const builder = Skia.PathBuilder.Make();
  builder.moveTo(outline[0][0], outline[0][1]);
  for (let i = 0; i < outline.length; i++) {
    const [cx, cy] = outline[i];
    const [nx, ny] = outline[(i + 1) % outline.length];
    builder.quadTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  builder.close();
  return builder.detach();
}

/** Bir vuruşun noktalarını mürekkep yoluna çevirir. Basınç yoksa hız tabanlı simülasyon açılır. */
export function strokeToPath(points: StrokePoint[], width: number, complete = true): SkPath | null {
  if (points.length === 0) return null;
  const outline = getStroke(points, {
    ...DEFAULT_PEN,
    size: width,
    simulatePressure: !hasRealPressure(points),
    last: complete,
  });
  return outlineToPath(outline);
}

// ---------------------------------------------------------------------------
// Çizim katmanı
// ---------------------------------------------------------------------------

export interface InkLayerProps {
  strokes: InkStroke[];
  width: number;
  height: number;
  livePath: SharedValue<SkPath>;
  liveColor: string;
}

function InkLayerBase({ strokes, width, height, livePath, liveColor }: InkLayerProps) {
  // Vuruş başına dış hat önbelleği: id değişmedikçe yeniden hesaplanmaz
  const cache = useRef(new Map<string, SkPath | null>());

  const picture = useMemo(() => {
    const live = new Set(strokes.map((s) => s.id));
    for (const id of cache.current.keys()) if (!live.has(id)) cache.current.delete(id);

    return createPicture(
      (canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        for (const s of strokes) {
          let path = cache.current.get(s.id);
          if (path === undefined) {
            path = strokeToPath(s.points, s.width);
            cache.current.set(s.id, path);
          }
          if (!path) continue;
          paint.setColor(Skia.Color(s.color));
          canvas.drawPath(path, paint);
        }
      },
      { width: Math.max(1, width), height: Math.max(1, height) },
    );
  }, [strokes, width, height]);

  return (
    <>
      <Picture picture={picture} />
      <Path path={livePath} color={liveColor} />
    </>
  );
}

export const InkLayer = memo(InkLayerBase);

// ---------------------------------------------------------------------------
// Giriş (jest) yakalama
// ---------------------------------------------------------------------------

export interface UseInkEngineOptions {
  color: string;
  width: number;
  enabled?: boolean;
  onStrokeEnd: (points: StrokePoint[]) => void;
}

/** Kalem/parmak hareketini yakalar, canlı yolu günceller ve vuruş bitince noktaları teslim eder. */
export function useInkEngine({ color, width, enabled = true, onStrokeEnd }: UseInkEngineOptions) {
  const livePath = useSharedValue<SkPath>(Skia.Path.Make());
  const points = useRef<StrokePoint[]>([]);

  const push = useCallback(
    (x: number, y: number, pressure: number | undefined) => {
      points.current.push([x, y, pressure ?? NEUTRAL_PRESSURE]);
      const path = strokeToPath(points.current, width, false);
      if (path) livePath.value = path;
    },
    [width, livePath],
  );

  const finish = useCallback(() => {
    const done = points.current;
    points.current = [];
    livePath.value = Skia.Path.Make();
    if (done.length > 0) onStrokeEnd(done);
  }, [onStrokeEnd, livePath]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          points.current = [];
          push(e.x, e.y, e.stylusData?.pressure);
        })
        .onUpdate((e) => push(e.x, e.y, e.stylusData?.pressure))
        .onFinalize(() => finish()),
    [enabled, push, finish],
  );

  return { gesture, livePath, liveColor: color };
}
