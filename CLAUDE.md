# Chronos Paper — Mimari Kurallar

Moleskine / Leuchtturm1917 hissiyatında, fiziksel defteri dijital verimlilik araçlarıyla birleştiren
mobil/tablet ajanda. Expo (SDK 57, prebuild uyumlu) + React Native + TypeScript.

Expo'ya özgü genel kurallar için `AGENTS.md` dosyasını da oku (sürümlü dokümanlar, `npx expo install`, CNG).

## Teknoloji Yığını

| Alan | Kütüphane | Not |
|---|---|---|
| Tuval / grafik | `@shopify/react-native-skia` | Tüm kağıt, mürekkep ve shader çizimi Skia ile |
| Mürekkep fiziği | `perfect-freehand` | Basınca duyarlı vuruş dış hattı |
| Animasyon | `react-native-reanimated` + `react-native-worklets` | Sayfa çevirme, elastik bant, yay fiziği UI iş parçacığında |
| Jestler | `react-native-gesture-handler` | Çizim, sürükle-bırak, sayfa çevirme |
| NLP | `chrono-node` | Türkçe/İngilizce tarih-saat ayrıştırma |
| Yerel veri | `@op-engineering/op-sqlite` | Local-first; şema `src/db/schema.ts` |
| Ses oynatma | `expo-audio` | `expo-av` SDK 57'de yok; yerine `expo-audio` kullanılır |
| Ses tanıma + kayıt | `expo-speech-recognition` | Cihazın yerel tanıma köprüsü; `recordingOptions.persist` ile WAV kaydı |
| El yazısı fontu | `@expo-google-fonts/caveat` | Girişler Caveat ile "mürekkep akışı" animasyonuyla yazılır |
| Haptik | `expo-haptics` | Sayfa çevirme ve araç değişiminde mikro titreşim |

Native modüller (Skia, op-sqlite) nedeniyle uygulama **Expo Go'da değil, development build'de** çalışır:
`npx expo run:ios` / `npx expo run:android` veya `eas build --profile development`.

## Dizin Yapısı

```
src/
  components/
    canvas/      Skia: NotebookPage, InkEngine, PaperBackground, shaders.ts (SkSL)
    calendar/    YearView → MonthView → DaySpread, TimelineStrip
    entry/       QuickEntryModal (Post-it), InboxPool (Havuz), HandwrittenEntry, MiniMonthPicker
    audio/       VoiceNoteButton (diktafon + Voice-to-Task), AudioPin (raptiye oynatıcı)
    notebook/    NotebookShell, PageCurl, CoverIntro (elastik bant), RibbonBookmark, PenToolbar
    dnd/         DragContext: Havuz → gün/saat sürükle-bırak (UI iş parçacığında isabet testi)
  services/      Saf iş mantığı: calendar.ts, nlp.ts (Türkçe chrono ayrıştırıcıları), haptics.ts
  state/         AgendaContext: veri tabanı, aktif defter, Yıl/Ay/Gün navigasyonu, kalem
  db/            schema.ts, migrate.ts, repository.ts, driver.ts (op-sqlite / test sürücüsü)
  types/         Paylaşılan TypeScript tipleri (models.ts tablolarla birebir)
  constants/     Renkler, ızgara ölçüleri, kalem varsayılanları (theme.ts)
scripts/         check-shaders.mjs (SkSL derleme kontrolü)
docs/previews/   Headless Skia ile üretilen kağıt / mürekkep / sayfa kıvırma önizlemeleri
```

## Kurallar

1. **Görsel doku prosedüreldir.** Kağıt, kraft ve eskitme dokuları Skia shader'ları veya hafif gürültü
   filtreleriyle üretilir; ağır bitmap görseller kullanılmaz. Fildişi kağıt rengi `#FDFBF7`.
2. **Renk ve ölçüler sabittir.** Bileşenlerde renk kodu yazılmaz; `src/constants/theme.ts` kullanılır.
3. **Çizim yolu önbelleklenir.** Tamamlanmış vuruşlar ve ızgara `SkPath` olarak bir kez üretilir, her
   karede yeniden hesaplanmaz. Sadece aktif (canlı) vuruş güncellenir.
4. **Animasyonlar UI iş parçacığında.** Sayfa çevirme, bant ve sürükleme animasyonları Reanimated
   shared value ve worklet'lerle yazılır; JS iş parçacığına `setState` döngüsü kurulmaz.
5. **Local-first.** Tüm veri önce SQLite'a yazılır; ağ bağımlılığı yoktur. Tablo adları küçük harf
   (`notebooks`, `pages`, `strokes`, `entries`), alanlar snake_case. Boolean alanlar INTEGER 0/1.
6. **Servisler saf kalır.** `src/services` içindeki fonksiyonlar React'e bağımlı olmaz ve birim testle
   doğrulanabilir (özellikle tarih hesapları ve chrono-node ayrıştırma).
7. **Haptik geri bildirim** her sayfa çevirmede ve araç değişiminde `expo-haptics` ile verilir.
8. **Native klasörler elle düzenlenmez.** `ios/` ve `android/` prebuild ile üretilir; yapılandırma
   `app.json` ve config plugin'lerle yapılır.
9. Paket eklerken `npx expo install <paket>` kullan (SDK uyumlu sürüm seçer). Ağ kısıtlıysa sürümü
   `node_modules/expo/bundledNativeModules.json` dosyasından alıp `npm install` ile sabitle.
10. Kod yorumları Türkçe yazılır.
11. **Türkçe NLP:** chrono-node'da Türkçe yerel ayar yoktur; Türkçe kalıplar `services/nlp.ts` içindeki
    özel Parser'larla eklenir. Türkçe metinde İngilizce ayrıştırıcı çalıştırılmaz ("sat" ≠ Saturday).
    Regex'lerde `\b`, lookbehind ve `\p{L}` kullanılmaz (Hermes uyumu ve Türkçe harfler için açık harf sınıfı).
12. **Shader değişikliği** sonrası `npm run check:shaders` ve render testleri çalıştırılır; SkSL hataları
    cihazda ancak çalışma anında görülür.
13. Sürükle-bırak isabet testi ve sayfa kıvırma ilerlemesi UI iş parçacığında (worklet) kalır; JS'e yalnızca
    bırakma / tamamlama anında `scheduleOnRN` ile dönülür.

## Komutlar

```bash
npm install
npm run typecheck      # tsc --noEmit
npm test               # Jest: takvim, NLP, SQLite repository, headless Skia çizim testleri
npm run check:shaders  # SkSL shader'larını CanvasKit ile derler
SAVE_PREVIEWS=1 npx jest src/components   # docs/previews PNG'lerini yeniler
npx expo run:ios       # development build (native modüller için gerekli)
npx expo run:android
```

Testler: `src/db/__tests__` gerçek SQL'i Node'un yerleşik `node:sqlite` modülüyle çalıştırır;
`src/components/canvas/__tests__` Skia bileşenlerini CanvasKit ile ekransız çizip piksel doğrular.

## Geliştirme Fazları

- **Faz 1 (tamamlandı):** Proje iskeleti, dizin yapısı, bağımlılıklar, temel Skia tuvali.
- **Faz 2 (tamamlandı):** `InkEngine.tsx` (perfect-freehand, SkPicture önbelleği, shared value canlı vuruş),
  `PaperBackground.tsx` (shader kağıt dokusu + çizgili/kareli/noktalı/boş).
- **Faz 3 (tamamlandı):** `calendar.ts`, Türkçe `nlp.ts`, SQLite repository, Yıl/Ay/Gün görünümleri,
  Quick-Entry Post-it, Havuz sürükle-bırak, zaman tüneli şeridi, ay indeks sekmeleri.
- **Faz 4 (tamamlandı):** Sesli not → görev hattı, raptiye oynatıcı, page-curl shader ile sayfa çevirme,
  elastik bantlı kapak açılışı, kumaş ayraç, haptikler.

## Bilinen Sınırlar

- Canlı vuruş dış hattı JS iş parçacığında hesaplanır (perfect-freehand worklet değildir).
- Sayfa çevirme, çevrilen sayfanın anlık görüntüsünü kıvırır; animasyon sırasında sayfa etkileşimsizdir.
- Android 12 ve altında ses tanıma sırasında kayıt yapılamaz; giriş ses iğnesi olmadan yazılır.
- Uygulama henüz gerçek cihazda çalıştırılmadı; testler Node üzerinde (CanvasKit, node:sqlite) koşar.
