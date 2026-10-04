# Chronos Paper

Fiziksel defter hissi veren ajanda uygulaması (Expo SDK 57 + React Native + TypeScript).
Mimari kurallar ve dizin yapısı için `CLAUDE.md` dosyasına bakın.

## Gereksinimler

- Node.js 22 veya üzeri
- iOS için: macOS + Xcode 26 (ve CocoaPods)
- Android için: Android Studio (SDK + bir emülatör veya USB hata ayıklaması açık telefon)

Uygulama Skia ve op-sqlite gibi native modüller kullandığı için **Expo Go'da açılmaz**;
bir development build gerekir.

## Kurulum ve cihazda çalıştırma

```bash
npm install
npx expo run:ios        # iPhone/iPad simülatörü veya bağlı cihaz
npx expo run:android    # Android emülatörü veya bağlı telefon
```

Mac'iniz yoksa EAS ile bulutta derleyebilirsiniz:

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # çıkan .apk dosyasını telefona kurun
npx expo start --dev-client                          # ardından uygulamayı açın
```

İlk açılışta mikrofon ve konuşma tanıma izinleri sorulur (sesli not için).

## Tarayıcı önizlemesi

```bash
npm run web:preview          # dist-web/ klasörüne web derlemesi üretir
npx serve dist-web           # veya: python3 -m http.server -d dist-web 8080
```

Zip paketinde hazır derlenmiş bir kopya `web-onizleme/` klasöründedir: `python3 -m http.server -d web-onizleme 8080`
komutuyla açıp tarayıcıda http://localhost:8080 adresine gidin (dosyaya çift tıklamak wasm yüzünden çalışmaz).

Web sürümünde sayfa kıvırma animasyonu, haptik titreşim ve ses kaydı yoktur; bunlar yalnızca cihazda çalışır.
Veriler tarayıcının localStorage alanında tutulur.

## Testler

```bash
npm run typecheck        # TypeScript kontrolü
npm test                 # Jest: takvim, Türkçe NLP, SQLite, Skia çizim testleri
npm run check:shaders    # SkSL shader derleme kontrolü
```

## Bilinen sınırlar

- Uygulama henüz gerçek bir cihazda denenmedi; testler Node üzerinde koşuyor.
- Android 12 ve altında konuşma tanıma sırasında ses kaydı alınamaz.
- Türkçe tarih ayrıştırma özel kurallarla yapılır ("yarın 15:00", "gelecek cuma", "3 gün sonra" vb.).
