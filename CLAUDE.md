# Chronos — Mimari Kurallar

Sade ajanda: takvimden gün seç, notunu hemen yaz. Tasarım dili Things 3'ten (beyaz alan, büyük gün
başlığı, yüzen "+" düğmesi, yerinde açılan not kartı), takvim Fantastical / Apple Takvim'den esinlenir.
Expo SDK 57 + React Native + TypeScript. Expo Go'da çalışır.

> 2026-10-04: Kullanıcı ilk "fiziksel defter" tasarımını (deri kapak, Skia kağıt, el yazısı, sayfa kıvırma,
> sesli not) eski bulup sade bir tasarım istedi. O sürüm git geçmişinde `d5a5458` commit'indedir.

Expo'ya özgü genel kurallar için `AGENTS.md` dosyasını da oku.

## Teknoloji

| Alan | Kütüphane |
|---|---|
| Yerel veri | `expo-sqlite` (web önizlemede `sql.js`, bkz. `src/db/sqliteDriver.web.ts`) |
| İkonlar | `@expo/vector-icons/Ionicons` (yalnızca Ionicons içe aktarılır; tüm paket web paketini şişirir) |
| Yazı tipi | Sistem yazı tipi (iOS'ta SF Pro); ölçek `theme.ts` → `Type` |
| Animasyon | `react-native-reanimated` (satır giriş/çıkış, kart açılışı, takvim genişleme) |
| Haptik | `expo-haptics` (web'de kapalı) |
| Güvenli alan | `react-native-safe-area-context` |

## Dizin Yapısı

```
App.tsx                 Kök: veri tabanı sürücüsü, AgendaProvider, yükleniyor ekranı
index.web.ts            Web girişi: sql.js yüklendikten sonra App'i kaydeder
src/
  components/           AgendaScreen (düzen + "+" düğmesi), CalendarView (hafta/ay), DayHeader,
                        NoteRow (kapalı satır), NoteEditor (açık not kartı: başlık, açıklama, saat, renk)
  constants/theme.ts    Açık/koyu palet, not renk etiketleri, yazı tipleri, ölçüler, usePalette()
  state/AgendaContext   Seçili gün, o günün notları, ekle/düzenle/tamamla/sil
  services/             calendar.ts (tarih yardımcıları), notes.ts (saat ayıklama/normalleştirme,
                        başlık+açıklama: ilk satır başlık), haptics.ts
  db/                   schema.ts, migrate.ts, repository.ts, sürücüler
```

## Kurallar

1. **Sade kal.** Tek ekran; takvim + notlar. Yeni görsel öğe eklemeden önce Things 3'te karşılığı var mı diye bak. Yeni özellik bu akışı (gün seç → yaz) yavaşlatmamalı.
2. **Renkler `theme.ts`'den.** Bileşenlerde renk kodu yazılmaz; `usePalette()` ile açık/koyu temaya uyulur.
3. **Şema değişikliği** `schema.ts`'te SCHEMA_VERSION artırılıp `UPGRADES`'e ALTER adımı eklenerek yapılır.
4. **Local-first.** Tüm veri SQLite'ta; ağ bağımlılığı yok. UI SQL yazmaz, `repository.ts` kullanır.
5. **Servisler saf kalır** ve birim testle doğrulanır (`src/services/__tests__`).
6. **Expo Go uyumu korunur.** Expo Go'da olmayan native modül eklenmez; gerekiyorsa önce kullanıcıya sorulur.
7. Paket eklerken `npx expo install <paket>`; ağ kısıtlıysa sürümü `node_modules/expo/bundledNativeModules.json`'dan al.
8. Kod yorumları Türkçe yazılır.

## Komutlar

```bash
npm install
npx expo start         # QR kodu Expo Go ile okut
npm run typecheck
npm test
npm run web:preview    # dist-web/ içine tarayıcı önizlemesi
```
