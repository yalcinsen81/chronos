# Chronos

Sade bir ajanda: takvimden günü seç, o günün notlarını hemen yaz.

| Telefon | Koyu tema | Tablet |
|---|---|---|
| ![](docs/screenshots/telefon.png) | ![](docs/screenshots/telefon-koyu.png) | ![](docs/screenshots/tablet.png) |

## Telefonda denemek (en kolay yol)

1. Telefona **Expo Go** uygulamasını kur (App Store / Google Play).
2. Bilgisayarda Node.js 22 veya üzeri kurulu olsun. Proje klasöründe:
   ```bash
   npm install
   npx expo start
   ```
3. Ekranda çıkan QR kodu iPhone'da kamerayla, Android'de Expo Go içinden okut.

Telefon ve bilgisayar aynı Wi-Fi ağında olmalı. Olmuyorsa `npx expo start --tunnel` dene.

## Kullanım

- Takvimde bir güne dokun; alttaki alana notunu yaz ve gönder.
- Notun başına veya sonuna saat yazarsan saat etiketi olur ve gün içinde sıralanır: `14:30 Diş hekimi`.
- Daireye dokununca not tamamlanır, metne dokununca düzenlenir, × ile silinir.
- Notu olan günlerin altında nokta görünür. Başka aydayken "Bugün" düğmesi bugüne döner.
- Telefonun açık/koyu temasına otomatik uyar.

## Tarayıcı önizlemesi

```bash
npm run web:preview
npx serve dist-web        # veya: python3 -m http.server -d dist-web 8080
```

Zip paketinde hazır derlenmiş kopya `web-onizleme/` klasöründedir:
`python3 -m http.server -d web-onizleme 8080` ile açıp http://localhost:8080 adresine git
(dosyaya çift tıklamak çalışmaz). Tarayıcıda notlar o tarayıcıya kaydedilir.

## Testler

```bash
npm run typecheck
npm test
```

## Mağaza için derleme (isteğe bağlı)

```bash
npm install -g eas-cli
eas build --platform android   # veya ios
```
