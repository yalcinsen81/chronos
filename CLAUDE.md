# Chronos — Mimari Kurallar

Sade, modern ajanda: üstte (tablette solda) aylık takvim, bir güne dokununca o günün notları açılır ve
alttaki alana hemen not yazılır. Expo SDK 57 + React Native + TypeScript. Expo Go'da çalışır.

> 2026-10-04: Kullanıcı ilk "fiziksel defter" tasarımını (deri kapak, Skia kağıt, el yazısı, sayfa kıvırma,
> sesli not) eski bulup sade bir tasarım istedi. O sürüm git geçmişinde `d5a5458` commit'indedir.

Expo'ya özgü genel kurallar için `AGENTS.md` dosyasını da oku.

## Teknoloji

| Alan | Kütüphane |
|---|---|
| Yerel veri | `expo-sqlite` (web önizlemede `sql.js`, bkz. `src/db/sqliteDriver.web.ts`) |
| Haptik | `expo-haptics` (web'de kapalı) |
| Güvenli alan | `react-native-safe-area-context` |

## Dizin Yapısı

```
App.tsx                 Kök: veri tabanı sürücüsü, AgendaProvider, yükleniyor ekranı
index.web.ts            Web girişi: sql.js yüklendikten sonra App'i kaydeder
src/
  components/           AgendaScreen (düzen), CalendarView (ay ızgarası), NotesPanel (notlar + yazma alanı)
  constants/theme.ts    Açık/koyu palet, boşluk ve köşe ölçüleri, usePalette()
  state/AgendaContext   Seçili gün, o günün notları, ekle/düzenle/tamamla/sil
  services/             calendar.ts (tarih yardımcıları), notes.ts (nottan saat ayıklama), haptics.ts
  db/                   schema.ts, migrate.ts, repository.ts, sürücüler
```

## Kurallar

1. **Sade kal.** Tek ekran; takvim + notlar. Yeni özellik bu akışı (gün seç → yaz) yavaşlatmamalı.
2. **Renkler `theme.ts`'den.** Bileşenlerde renk kodu yazılmaz; `usePalette()` ile açık/koyu temaya uyulur.
3. **Local-first.** Tüm veri SQLite'ta; ağ bağımlılığı yok. UI SQL yazmaz, `repository.ts` kullanır.
4. **Servisler saf kalır** ve birim testle doğrulanır (`src/services/__tests__`).
5. **Expo Go uyumu korunur.** Expo Go'da olmayan native modül eklenmez; gerekiyorsa önce kullanıcıya sorulur.
6. Paket eklerken `npx expo install <paket>`; ağ kısıtlıysa sürümü `node_modules/expo/bundledNativeModules.json`'dan al.
7. Kod yorumları Türkçe yazılır.

## Komutlar

```bash
npm install
npx expo start         # QR kodu Expo Go ile okut
npm run typecheck
npm test
npm run web:preview    # dist-web/ içine tarayıcı önizlemesi
```
