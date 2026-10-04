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
| Ses | `expo-audio` | `expo-av` SDK 57'de yok; yerine `expo-audio` kullanılır |
| Haptik | `expo-haptics` | Sayfa çevirme ve araç değişiminde mikro titreşim |

Native modüller (Skia, op-sqlite) nedeniyle uygulama **Expo Go'da değil, development build'de** çalışır:
`npx expo run:ios` / `npx expo run:android` veya `eas build --profile development`.

## Dizin Yapısı

```
src/
  components/
    canvas/      Skia tuvali: NotebookPage, InkEngine, PaperBackground
  services/      Saf iş mantığı: calendar.ts, nlp.ts, audio.ts (UI içermez)
  db/            SQLite şeması, bağlantı ve repository fonksiyonları
  types/         Paylaşılan TypeScript tipleri (models.ts tablolarla birebir)
  constants/     Renkler, ızgara ölçüleri, kalem varsayılanları (theme.ts)
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
9. Paket eklerken `npx expo install <paket>` kullan (SDK uyumlu sürüm seçer).
10. Kod yorumları Türkçe yazılır.

## Komutlar

```bash
npm install
npm run typecheck      # tsc --noEmit
npx expo run:ios       # development build (native modüller için gerekli)
npx expo run:android
```

## Geliştirme Fazları

- **Faz 1 (tamamlandı):** Proje iskeleti, dizin yapısı, bağımlılıklar, temel Skia tuvali (`NotebookPage.tsx`).
- **Faz 2:** `InkEngine.tsx` (perfect-freehand + Skia, UI iş parçacığı), `PaperBackground.tsx` (çizgili/kareli/noktalı/boş).
- **Faz 3:** `services/calendar.ts`, Quick-Entry modalı, Inbox (Havuz) sürükle-bırak, chrono-node testleri.
- **Faz 4:** Ses kaydı + raptiye oynatıcı, sayfa çevirme animasyonları.
