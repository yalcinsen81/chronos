// Prosedürel kağıt arka planı: shader ile kağıt dokusu + Skia yolu olarak sayfa deseni.
// Bir Skia <Canvas> içinde kullanılır. Desen yolları boyut veya tip değişmedikçe yeniden üretilmez.

import { memo, useMemo } from 'react';
import { Fill, Group, Path, Shader, Skia, type SkPath, type SkRuntimeEffect } from '@shopify/react-native-skia';

import {
  DOT_RADIUS,
  GRID_SPACING,
  LINE_HEIGHT,
  MARGIN_LEFT,
  PaperColors,
  PaperStyles,
} from '../../constants/theme';
import type { PageType, PaperType } from '../../types/models';
import { PAPER_SHADER } from './shaders';

// Shader modül yüklenirken bir kez derlenir
const paperEffect: SkRuntimeEffect | null = Skia.RuntimeEffect.Make(PAPER_SHADER);

export interface PaperBackgroundProps {
  width: number;
  height: number;
  pageType: PageType;
  paperStyle?: PaperType;
  /** Desenin başlayacağı üst boşluk (başlık alanı için) */
  topInset?: number;
}

interface PatternPaths {
  main: SkPath | null;
  margin: SkPath | null;
}

/** Sayfa tipine göre desen yolunu üretir. Saf fonksiyon; testlerde de kullanılabilir. */
export function buildPattern(type: PageType, width: number, height: number, topInset = 0): PatternPaths {
  if (type === 'blank' || width <= 0 || height <= 0) return { main: null, margin: null };
  const b = Skia.PathBuilder.Make();

  if (type === 'dot') {
    for (let y = topInset + GRID_SPACING; y < height; y += GRID_SPACING) {
      for (let x = GRID_SPACING; x < width; x += GRID_SPACING) b.addCircle(x, y, DOT_RADIUS);
    }
    return { main: b.detach(), margin: null };
  }

  if (type === 'grid') {
    for (let y = topInset + GRID_SPACING; y < height; y += GRID_SPACING) b.moveTo(0, y).lineTo(width, y);
    for (let x = GRID_SPACING; x < width; x += GRID_SPACING) b.moveTo(x, topInset).lineTo(x, height);
    return { main: b.detach(), margin: null };
  }

  // Çizgili: yatay satırlar + sol kenarda kırmızı çizgi
  for (let y = topInset + LINE_HEIGHT; y < height; y += LINE_HEIGHT) b.moveTo(0, y).lineTo(width, y);
  const m = Skia.PathBuilder.Make().moveTo(MARGIN_LEFT, 0).lineTo(MARGIN_LEFT, height);
  return { main: b.detach(), margin: m.detach() };
}

function PaperBackgroundBase({ width, height, pageType, paperStyle = 'ivory', topInset = 0 }: PaperBackgroundProps) {
  const style = PaperStyles[paperStyle];
  const pattern = useMemo(
    () => buildPattern(pageType, width, height, topInset),
    [pageType, width, height, topInset],
  );

  const uniforms = useMemo(
    () => ({
      resolution: [width, height],
      baseColor: [...style.base],
      grain: style.grain,
      fiber: style.fiber,
      aging: style.aging,
    }),
    [width, height, style],
  );

  const patternColor = pageType === 'dot' ? PaperColors.gridDot : PaperColors.gridLine;
  const isStroke = pageType === 'grid' || pageType === 'lined';

  return (
    <Group>
      {paperEffect ? (
        <Fill>
          <Shader source={paperEffect} uniforms={uniforms} />
        </Fill>
      ) : (
        // Shader derlenemezse düz fildişi renge düşülür
        <Fill color={PaperColors.ivory} />
      )}
      {pattern.main && (
        <Path
          path={pattern.main}
          color={patternColor}
          style={isStroke ? 'stroke' : 'fill'}
          strokeWidth={pageType === 'grid' ? 0.6 : 0.8}
        />
      )}
      {pattern.margin && <Path path={pattern.margin} color={PaperColors.margin} style="stroke" strokeWidth={1} />}
    </Group>
  );
}

export const PaperBackground = memo(PaperBackgroundBase);
export default PaperBackground;
