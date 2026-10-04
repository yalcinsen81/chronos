// Defter sayfası tuvali: prosedürel kağıt arka planı + mürekkep katmanı.
// Vuruşların kalıcılığı üst bileşene aittir (controlled): strokes içeri gelir, yeni vuruş onAddStroke ile çıkar.

import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';

import { DEFAULT_PEN, InkColors } from '../../constants/theme';
import type { PageType, PaperType, StrokePoint } from '../../types/models';
import { InkLayer, useInkEngine, type InkStroke } from './InkEngine';
import { PaperBackground } from './PaperBackground';

export interface NotebookPageProps {
  strokes: InkStroke[];
  onAddStroke: (stroke: Omit<InkStroke, 'id'>) => void;
  pageType?: PageType;
  paperStyle?: PaperType;
  inkColor?: string;
  penSize?: number;
  drawingEnabled?: boolean;
  topInset?: number;
  /** Tuvalin üstünde, dokunmaları geçiren katman (başlık, el yazısı girişler vb.) */
  children?: ReactNode;
}

export default function NotebookPage({
  strokes,
  onAddStroke,
  pageType = 'dot',
  paperStyle = 'ivory',
  inkColor = InkColors.midnight,
  penSize = DEFAULT_PEN.size,
  drawingEnabled = true,
  topInset = 0,
  children,
}: NotebookPageProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const onStrokeEnd = useCallback(
    (points: StrokePoint[]) => onAddStroke({ points, color: inkColor, width: penSize }),
    [onAddStroke, inkColor, penSize],
  );

  const { gesture, livePath, liveColor } = useInkEngine({
    color: inkColor,
    width: penSize,
    enabled: drawingEnabled,
    onStrokeEnd,
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout}>
        {size.width > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            <PaperBackground
              width={size.width}
              height={size.height}
              pageType={pageType}
              paperStyle={paperStyle}
              topInset={topInset}
            />
            <InkLayer
              strokes={strokes}
              width={size.width}
              height={size.height}
              livePath={livePath}
              liveColor={liveColor}
            />
          </Canvas>
        )}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
