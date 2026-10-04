// 3D sayfa çevirme (page-curl).
//
// Sayfanın anlık görüntüsü (makeImageFromView) Skia'da silindirik kıvırma shader'ı ile çizilir.
// Kıvrım çizgisi (fold) bir shared value'dur; parmak hareketi ve animasyon UI iş parçacığında
// ilerler. Çevrilen sayfanın altında yeni gün zaten render edilmiş olur.
//
//  İleri (sağ kenardan sola çekiş):  anlık görüntü = bugün, alttaki içerik = yarın
//  Geri  (sol kenardan sağa çekiş):  alt görüntü = bugün (sabit), üstten geri kıvrılan = dün

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Fill,
  Image,
  ImageShader,
  makeImageFromView,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PaperStyles } from '../../constants/theme';
import { haptics } from '../../services/haptics';
import { PAGE_CURL_SHADER } from '../canvas/shaders';

const curlEffect = Skia.RuntimeEffect.Make(PAGE_CURL_SHADER);
const RADIUS = 46;
const EDGE = 30; // kenardan tutma alanı (pt)
const DURATION = 620;

export interface PageCurlHandle {
  /** Programatik çevirme (ok tuşları, zaman şeridi vb.) */
  turn: (delta: number) => void;
}

export interface PageCurlProps {
  /** Tarihi gün farkı kadar değiştirir. İptal edilen çevirmede ters farkla tekrar çağrılır. */
  onNavigate: (delta: number) => void;
  children: ReactNode;
  enabled?: boolean;
}

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 90))));

const PageCurl = forwardRef<PageCurlHandle, PageCurlProps>(function PageCurl({ onNavigate, children, enabled = true }, ref) {
  const contentRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [over, setOver] = useState<SkImage | null>(null);
  const [under, setUnder] = useState<SkImage | null>(null);
  const busy = useRef(false);

  const fold = useSharedValue(0);
  const ready = useSharedValue(false);
  const width = useSharedValue(0);
  const W = size.width;
  const CLOSED = -Math.PI * RADIUS - 24; // tamamen çevrilmiş konum

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    width.value = w;
    setSize({ width: w, height: h });
  };

  const snapshot = useCallback(async () => {
    // Web'de görünüm anlık görüntüsü desteklenmez: çevirme animasyonsuz sayfa geçişine düşer
    if (Platform.OS === 'web') return null;
    try {
      return await makeImageFromView(contentRef);
    } catch {
      return null;
    }
  }, []);

  const finish = useCallback(() => {
    ready.value = false;
    setOver(null);
    setUnder(null);
    busy.current = false;
  }, [ready]);

  const completed = useCallback(() => {
    haptics.pageTurn();
    finish();
  }, [finish]);

  const cancelled = useCallback(
    (delta: number) => {
      // Alttaki içerik eski güne döndürülür; üst görüntü sayfayı kapattığı için geçiş görünmez
      onNavigate(-delta);
      finish();
    },
    [onNavigate, finish],
  );

  /** Çevirmeyi hazırlar: görüntüleri alır ve tarihi değiştirir. Başarısızsa doğrudan geçer. */
  const prepare = useCallback(
    async (delta: number): Promise<boolean> => {
      if (busy.current || !curlEffect || W === 0) return false;
      busy.current = true;
      const current = await snapshot();
      if (!current) {
        busy.current = false;
        onNavigate(delta);
        haptics.pageTurn();
        return false;
      }
      if (delta > 0) {
        fold.value = W;
        setOver(current);
        onNavigate(delta);
      } else {
        setUnder(current);
        onNavigate(delta);
        await nextFrames(); // yeni günün içeriği çizilsin
        const previous = await snapshot();
        if (!previous) {
          finish();
          return false;
        }
        fold.value = CLOSED;
        setOver(previous);
      }
      ready.value = true;
      return true;
    },
    [W, CLOSED, snapshot, onNavigate, fold, ready, finish],
  );

  const animateTo = useCallback(
    (delta: number, commit: boolean) => {
      'worklet';
      const target = delta > 0 === commit ? CLOSED : width.value;
      fold.value = withTiming(target, { duration: DURATION, easing: Easing.out(Easing.cubic) }, (done) => {
        if (!done) return;
        if (commit) scheduleOnRN(completed);
        else scheduleOnRN(cancelled, delta);
      });
    },
    [CLOSED, fold, width, completed, cancelled],
  );

  useImperativeHandle(
    ref,
    () => ({
      turn: (delta) => {
        if (delta === 0) return;
        prepare(delta).then((ok) => {
          if (ok) animateTo(delta, true);
        });
      },
    }),
    [prepare, animateTo],
  );

  // --- Kenar jestleri ---------------------------------------------------------
  // Görüntü hazırlanırken parmak kalkarsa karar burada bekletilir
  const pendingEnd = useRef<boolean | null>(null);

  const startTurn = useCallback(
    async (delta: number) => {
      pendingEnd.current = null;
      const ok = await prepare(delta);
      if (ok && pendingEnd.current !== null) {
        animateTo(delta, pendingEnd.current);
        pendingEnd.current = null;
      }
    },
    [prepare, animateTo],
  );

  const endEarly = useCallback((commit: boolean) => {
    pendingEnd.current = commit;
  }, []);

  const makeEdgeGesture = (delta: 1 | -1) =>
    Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX(delta === 1 ? [-12, 9999] : [-9999, 12])
      .onStart(() => {
        scheduleOnRN(startTurn, delta);
      })
      .onUpdate((e) => {
        if (!ready.value) return;
        const w = width.value;
        if (delta === 1) {
          fold.value = Math.max(CLOSED, Math.min(w, w + e.translationX * 1.15));
        } else {
          const t = Math.max(0, Math.min(1, e.translationX / w));
          fold.value = CLOSED + (w - CLOSED) * t;
        }
      })
      .onEnd((e) => {
        if (!ready.value) {
          // Görüntü henüz hazır değil: belirgin bir çekişse çevirme tamamlanır
          scheduleOnRN(endEarly, Math.abs(e.translationX) > 40);
          return;
        }
        const w = width.value;
        const progress = delta === 1 ? (w - fold.value) / (w - CLOSED) : (fold.value - CLOSED) / (w - CLOSED);
        const fast = delta === 1 ? e.velocityX < -600 : e.velocityX > 600;
        animateTo(delta, progress > 0.35 || fast);
      });

  const forward = makeEdgeGesture(1);
  const backward = makeEdgeGesture(-1);

  const uniforms = useDerivedValue(() => ({
    resolution: [width.value, size.height],
    fold: fold.value,
    radius: RADIUS,
    backColor: [...PaperStyles.ivory.base],
  }));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View ref={contentRef} collapsable={false} style={styles.content}>
        {children}
      </View>

      {over && curlEffect && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {under && <Image image={under} x={0} y={0} width={W} height={size.height} fit="fill" />}
          <Fill>
            <Shader source={curlEffect} uniforms={uniforms}>
              <ImageShader image={over} fit="fill" rect={{ x: 0, y: 0, width: W, height: size.height }} />
            </Shader>
          </Fill>
        </Canvas>
      )}

      <GestureDetector gesture={backward}>
        <View style={[styles.edge, styles.left]} />
      </GestureDetector>
      <GestureDetector gesture={forward}>
        <View style={[styles.edge, styles.right]} />
      </GestureDetector>
    </View>
  );
});

export default PageCurl;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  edge: { position: 'absolute', top: 60, bottom: 0, width: EDGE },
  left: { left: 0 },
  right: { right: 0 },
});
