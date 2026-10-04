// Faz 1: Temel Skia çizim tuvali.
// Fildişi kağıt üzerinde noktalı ızgara çizer ve parmak/kalem hareketlerini
// perfect-freehand ile basınca duyarlı mürekkep vuruşlarına dönüştürür.
// Faz 2'de mürekkep mantığı InkEngine.tsx'e, arka plan PaperBackground.tsx'e taşınacak.

import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { getStroke } from 'perfect-freehand';

import { DEFAULT_PEN, DOT_RADIUS, GRID_SPACING, InkColors, PaperColors } from '../../constants/theme';
import type { StrokePoint } from '../../types/models';

interface DrawnStroke {
  id: string;
  path: SkPath;
  color: string;
}

export interface NotebookPageProps {
  inkColor?: string;
  penSize?: number;
}

/** perfect-freehand'in döndürdüğü dış hat noktalarından kapalı, yumuşak bir Skia yolu üretir. */
function outlineToPath(outline: number[][]): SkPath | null {
  if (outline.length < 2) return null;
  const builder = Skia.PathBuilder.Make();
  const [x0, y0] = outline[0];
  builder.moveTo(x0, y0);
  // Ardışık noktaların orta noktalarına quadTo ile bağlanarak köşesiz kenar elde edilir
  for (let i = 0; i < outline.length; i++) {
    const [cx, cy] = outline[i];
    const [nx, ny] = outline[(i + 1) % outline.length];
    builder.quadTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  builder.close();
  return builder.detach();
}

/** Basınç verisi gelmediyse (parmakla çizim) hız tabanlı basınç simülasyonu açılır. */
function buildInkPath(points: StrokePoint[], size: number, hasRealPressure: boolean): SkPath | null {
  const outline = getStroke(points, {
    ...DEFAULT_PEN,
    size,
    simulatePressure: !hasRealPressure,
    last: true,
  });
  return outlineToPath(outline);
}

/** Noktalı (dot-grid) arka planı tek bir yol olarak üretir; her karede yeniden hesaplanmaz. */
function buildDotGrid(width: number, height: number): SkPath {
  const builder = Skia.PathBuilder.Make();
  for (let y = GRID_SPACING; y < height; y += GRID_SPACING) {
    for (let x = GRID_SPACING; x < width; x += GRID_SPACING) {
      builder.addCircle(x, y, DOT_RADIUS);
    }
  }
  return builder.detach();
}

export default function NotebookPage({ inkColor = InkColors.midnight, penSize = DEFAULT_PEN.size }: NotebookPageProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<DrawnStroke[]>([]);
  const [livePath, setLivePath] = useState<SkPath | null>(null);

  // Aktif vuruş noktaları render tetiklememesi için ref'te tutulur
  const pointsRef = useRef<StrokePoint[]>([]);
  const realPressureRef = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const dotGrid = useMemo(
    () => (size.width > 0 ? buildDotGrid(size.width, size.height) : null),
    [size.width, size.height],
  );

  const addPoint = useCallback(
    (x: number, y: number, pressure: number | undefined) => {
      if (pressure !== undefined) realPressureRef.current = true;
      pointsRef.current.push([x, y, pressure ?? 0.5]);
      setLivePath(buildInkPath(pointsRef.current, penSize, realPressureRef.current));
    },
    [penSize],
  );

  const commitStroke = useCallback(() => {
    const path = buildInkPath(pointsRef.current, penSize, realPressureRef.current);
    if (path) {
      setStrokes((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, path, color: inkColor }]);
    }
    // Faz 3'te noktalar burada Strokes tablosuna points_json olarak yazılacak
    pointsRef.current = [];
    realPressureRef.current = false;
    setLivePath(null);
  }, [inkColor, penSize]);

  // Faz 1'de jest geri çağrıları JS iş parçacığında çalışır (perfect-freehand worklet değil).
  // Faz 2'de vuruş hesaplaması UI iş parçacığına taşınarak gecikme düşürülecek.
  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          pointsRef.current = [];
          realPressureRef.current = false;
          addPoint(e.x, e.y, e.stylusData?.pressure);
        })
        .onUpdate((e) => addPoint(e.x, e.y, e.stylusData?.pressure))
        .onFinalize(() => commitStroke()),
    [addPoint, commitStroke],
  );

  return (
    <GestureDetector gesture={drawGesture}>
      <View style={styles.container} onLayout={onLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size.width} height={size.height} color={PaperColors.ivory} />
          {dotGrid && <Path path={dotGrid} color={PaperColors.gridDot} />}
          {strokes.map((s) => (
            <Path key={s.id} path={s.path} color={s.color} />
          ))}
          {livePath && <Path path={livePath} color={inkColor} />}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PaperColors.ivory,
  },
});
