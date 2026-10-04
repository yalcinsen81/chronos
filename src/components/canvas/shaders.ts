// SkSL shader kaynakları. Ağır bitmap dokular yerine prosedürel üretim kullanılır.
// Bu dosya saf string içerir; CanvasKit ile Node ortamında derlenerek test edilir.

/**
 * Kağıt dokusu: ince tane + bulutumsu lif yoğunluğu + yatay lifler + kenar eskitmesi.
 * uniform'lar: resolution (px), baseColor (0..1 RGB), grain, fiber, aging (0..1)
 */
export const PAPER_SHADER = `
uniform float2 resolution;
uniform float3 baseColor;
uniform float grain;
uniform float fiber;
uniform float aging;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float g = hash(floor(xy)) - 0.5;
  float cloud = fbm(xy * 0.012) - 0.5;
  float fib = noise(float2(xy.x * 0.5, xy.y * 0.04)) - 0.5;

  float3 col = baseColor;
  col += g * grain * 0.04 + cloud * 0.045 + fib * fiber * 0.025;

  // Kenarlara doğru eskime ve hafif sararma
  float vig = smoothstep(0.35, 0.78, length(uv - 0.5));
  col *= 1.0 - vig * aging * 0.2;
  col = mix(col, col * float3(0.97, 0.91, 0.80), aging * clamp(cloud + 0.5, 0.0, 1.0) * 0.3);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

/**
 * Silindirik sayfa kıvırma (page-curl). Sayfa sağdan sola, dikey bir kıvrım çizgisi
 * etrafında silindire sarılarak kalkar. "image" çevrilen sayfanın anlık görüntüsüdür.
 * fold: kıvrım çizgisinin x konumu (W → sayfa düz, -PI*radius → tamamen çevrildi)
 * Kıvrımın sağında kalan alan saydamdır; altındaki yeni sayfa görünür.
 */
export const PAGE_CURL_SHADER = `
uniform shader image;
uniform float2 resolution;
uniform float fold;
uniform float radius;
uniform float3 backColor;

const float PI = 3.14159265;

half4 backSide(float sx, float y, float shade) {
  // Arka yüz: kağıt rengi, ön yüzdeki mürekkep çok hafif ayna gibi sızar
  half4 c = image.eval(float2(sx, y));
  half3 col = mix(half3(backColor), c.rgb, 0.10);
  return half4(col * half(shade), 1.0);
}

half4 main(float2 xy) {
  float W = resolution.x;
  float x = xy.x;
  float p = fold;
  float R = radius;

  if (x > p + R) {
    // Kalkan sayfanın alttaki sayfaya düşürdüğü yumuşak gölge
    float s = clamp((x - p - R) / (R * 1.6), 0.0, 1.0);
    float a = p < W ? (1.0 - s) * (1.0 - s) * 0.28 : 0.0;
    return half4(0.0, 0.0, 0.0, half(a));
  }

  if (x > p) {
    float d = clamp((x - p) / R, 0.0, 1.0);
    float phi1 = asin(d);
    float phi2 = PI - phi1;
    float s2 = p + R * phi2;
    if (s2 <= W) {
      // Silindirin üst yarısı: sayfanın arka yüzü bize bakar
      return backSide(s2, xy.y, 0.78 + 0.22 * sin(phi2));
    }
    float s1 = p + R * phi1;
    if (s1 <= W) {
      // Silindirin alt yarısı: ön yüz, kenara doğru kararır
      half4 c = image.eval(float2(s1, xy.y));
      float shade = 1.0 - 0.35 * d * d;
      return half4(c.rgb * half(shade), c.a);
    }
    return half4(0.0);
  }

  // Kıvrım çizgisinin solu: önce üste katlanmış düz arka yüz kontrol edilir
  float sb = 2.0 * p + PI * R - x;
  if (sb <= W && sb >= p + PI * R) {
    return backSide(sb, xy.y, 0.92);
  }
  if (x < 0.0) {
    return half4(0.0);
  }
  half4 c = image.eval(xy);
  // Kıvrıma yaklaştıkça ön yüzde hafif ortam gölgesi
  float ao = 1.0 - 0.12 * smoothstep(p - R * 2.0, p, x);
  return half4(c.rgb * half(ao), c.a);
}
`;

/** Deri / kraft kapak dokusu (kapak açılış animasyonunda kullanılır). */
export const LEATHER_SHADER = `
uniform float2 resolution;
uniform float3 baseColor;

float hash(float2 p) {
  p = fract(p * float2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float cell(float2 p) {
  // Deri gözenekleri için basit Voronoi mesafesi
  float2 i = floor(p);
  float2 f = fract(p);
  float m = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float2 o = float2(float(x), float(y));
      float2 r = o + float2(hash(i + o), hash(i + o + 7.1)) - f;
      m = min(m, dot(r, r));
    }
  }
  return sqrt(m);
}

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float c = cell(xy * 0.09);
  float grain = hash(floor(xy)) - 0.5;
  float3 col = baseColor * (0.86 + 0.22 * c) + grain * 0.025;
  float vig = smoothstep(0.3, 0.85, length(uv - 0.5));
  col *= 1.0 - vig * 0.35;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;
