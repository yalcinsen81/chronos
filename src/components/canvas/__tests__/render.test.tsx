/**
 * @jest-environment @shopify/react-native-skia/jestEnv.js
 */
// Skia bileşenlerini CanvasKit ile ekransız (headless) çizer ve piksel düzeyinde doğrular.
// SAVE_PREVIEWS=1 ile çalıştırılırsa PNG önizlemeleri docs/previews klasörüne yazılır.

import fs from 'fs';
import path from 'path';

import { CoverColors, PaperStyles } from '../../../constants/theme';
import type { PageType, PaperType, StrokePoint } from '../../../types/models';
import { LEATHER_SHADER, PAGE_CURL_SHADER } from '../shaders';

jest.mock('@shopify/react-native-skia', () => {
  const Platform = {
    OS: 'web',
    PixelRatio: 1,
    requireNativeComponent: () => undefined,
    resolveAsset: () => undefined,
    findNodeHandle: () => undefined,
    NativeModules: () => undefined,
    View: () => undefined,
  };
  jest.mock('@shopify/react-native-skia/lib/commonjs/Platform', () => ({ ...Platform, Platform }));
  return require('@shopify/react-native-skia/lib/commonjs/mock').Mock((global as any).CanvasKit);
});

// Bu testte yalnızca saf çizim fonksiyonları kullanılır; animasyon/jest modülleri boş geçilir
jest.mock('react-native-reanimated', () => ({ useSharedValue: (v: unknown) => ({ value: v }) }));
jest.mock('react-native-gesture-handler', () => ({ Gesture: {} }));

// eslint-disable-next-line import/first
import { Fill, Group, Image, ImageShader, Path, Shader, Skia, type SkImage } from '@shopify/react-native-skia';
// eslint-disable-next-line import/first
import { drawOffscreen, makeOffscreenSurface } from '@shopify/react-native-skia/lib/commonjs/headless';
// eslint-disable-next-line import/first
import { strokeToPath } from '../InkEngine';
// eslint-disable-next-line import/first
import { PaperBackground } from '../PaperBackground';

const W = 360;
const H = 480;
jest.setTimeout(60_000); // CPU üzerinde shader çizimi yavaştır

const OUT = path.join(__dirname, '../../../../docs/previews');
const save = (name: string, img: SkImage) => {
  if (!process.env.SAVE_PREVIEWS) return;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(img.encodeToBytes()));
};

function pixel(img: SkImage, x: number, y: number): [number, number, number, number] {
  const data = img.readPixels(x, y, { width: 1, height: 1, colorType: 4, alphaType: 1 }) as Uint8Array;
  return [data[0], data[1], data[2], data[3]];
}

const draw = async (el: React.ReactElement, w = W, h = H) => drawOffscreen(makeOffscreenSurface(w, h), el);

// El yazısını andıran sentetik vuruş: "Chronos" altına dalgalı çizgi, değişken basınç
function wavyStroke(y0: number): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts.push([40 + t * 280, y0 + Math.sin(t * Math.PI * 4) * 18, 0.25 + 0.7 * Math.sin(t * Math.PI)]);
  }
  return pts;
}

describe('PaperBackground', () => {
  it.each<[PageType, PaperType]>([
    ['dot', 'ivory'],
    ['grid', 'ivory'],
    ['lined', 'aged'],
    ['blank', 'kraft'],
  ])('%s / %s deseni ve kağıt rengi', async (pageType, paper) => {
    const img = await draw(<PaperBackground width={W} height={H} pageType={pageType} paperStyle={paper} />);
    save(`paper-${pageType}-${paper}`, img);
    // Desen dışındaki bir noktada kağıt tabanına yakın renk beklenir (doku ±%10)
    const [r, g, b, a] = pixel(img, W / 2 + 7, H / 2 + 5);
    const base = PaperStyles[paper].base.map((c) => c * 255);
    expect(a).toBe(255);
    expect(Math.abs(r - base[0])).toBeLessThan(28);
    expect(Math.abs(g - base[1])).toBeLessThan(28);
    expect(Math.abs(b - base[2])).toBeLessThan(28);
  });
});

describe('InkEngine', () => {
  it('basınçlı vuruş kalın-ince değişen kapalı yol üretir', async () => {
    const stroke = strokeToPath(wavyStroke(200), 6)!;
    expect(stroke).toBeTruthy();
    const bounds = stroke.getBounds();
    expect(bounds.width).toBeGreaterThan(270);

    const img = await draw(
      <Group>
        <PaperBackground width={W} height={H} pageType="dot" />
        <Path path={stroke} color="#1B2A4A" />
        <Path path={strokeToPath(wavyStroke(320), 3)!} color="#A4262C" />
      </Group>,
    );
    save('ink-strokes', img);
    // Vuruşun ortası (en yüksek basınç) mürekkep rengindedir
    const [r, g, b] = pixel(img, 180, 200);
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(120);
  });

  it('parmakla çizimde (basınçsız) simülasyon yine de yol üretir', () => {
    const pts: StrokePoint[] = wavyStroke(100).map(([x, y]) => [x, y, 0.5]);
    expect(strokeToPath(pts, 4)).toBeTruthy();
  });
});

describe('Shader’lar', () => {
  it('sayfa kıvırma: kıvrımın sağı saydam, solu sayfa, kıvrım üstü arka yüz', async () => {
    const effect = Skia.RuntimeEffect.Make(PAGE_CURL_SHADER)!;
    expect(effect).toBeTruthy();
    const page = await draw(
      <Group>
        <PaperBackground width={W} height={H} pageType="lined" />
        <Path path={strokeToPath(wavyStroke(140), 6)!} color="#1B2A4A" />
      </Group>,
    );
    const R = 46;
    const frames = [W, W * 0.62, W * 0.3, -Math.PI * R - 24];
    for (const [i, fold] of frames.entries()) {
      const img = await draw(
        <Group>
          <Fill color="#C9B48A" />
          <Fill>
            <Shader
              source={effect}
              uniforms={{ resolution: [W, H], fold, radius: R, backColor: [...PaperStyles.ivory.base] }}
            >
              <ImageShader image={page} fit="fill" rect={{ x: 0, y: 0, width: W, height: H }} />
            </Shader>
          </Fill>
        </Group>,
      );
      save(`curl-${i}`, img);
      if (i === 1) {
        // Kıvrımın çok sağı: alttaki (arka plan) renk görünür
        const under = pixel(img, W - 4, 20);
        expect(Math.abs(under[0] - 0xc9)).toBeLessThan(12);
        // Kıvrımın solu: sayfa hâlâ yerinde (açık renk kağıt)
        const front = pixel(img, 10, 20);
        expect(front[0]).toBeGreaterThan(220);
      }
      if (i === 3) {
        // Tamamen çevrilmiş: her yerde alttaki renk
        const p = pixel(img, W / 2, H / 2);
        expect(Math.abs(p[0] - 0xc9)).toBeLessThan(12);
      }
    }
  });

  it('deri kapak dokusu derlenir ve koyu kahverengi üretir', async () => {
    const effect = Skia.RuntimeEffect.Make(LEATHER_SHADER)!;
    const img = await draw(
      <Fill>
        <Shader source={effect} uniforms={{ resolution: [W, H], baseColor: [...CoverColors.leather] }} />
      </Fill>,
    );
    save('cover-leather', img);
    const [r, g, b] = pixel(img, W / 2, H / 2);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(r).toBeLessThan(110);
  });
});

// Kullanılmayan içe aktarma uyarısını önlemek için (Image önizleme yardımcıları için tutulur)
void Image;
