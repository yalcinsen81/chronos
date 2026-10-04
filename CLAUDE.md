# Chronos — Mimari Kurallar

Şık ve sade ajanda paneli: selam başlığı, gradyanlı gün özeti, hafta şeridi / açılır ay takvimi, renk
etiketli not kartları ve takvimin altında geniş, çok satırlı "Yeni not" kartı. Bir güne dokun, hemen yaz. Expo SDK 57 + React Native + TypeScript. Expo Go'da çalışır.

> 2026-10-04: Kullanıcı ilk "fiziksel defter" tasarımını (deri kapak, Skia kağıt, el yazısı, sayfa kıvırma,
> sesli not) eski bulup sade bir tasarım istedi. O sürüm git geçmişinde `d5a5458` commit'indedir.

Expo'ya özgü genel kurallar için `AGENTS.md` dosyasını da oku.

## Teknoloji

| Alan | Kütüphane |
|---|---|
| Yerel veri | `expo-sqlite` (web önizlemede `sql.js`, bkz. `src/db/sqliteDriver.web.ts`) |
| İkonlar | `@expo/vector-icons/Ionicons` (yalnızca Ionicons içe aktarılır; tüm paket web paketini şişirir) |
| Yazı tipi | Plus Jakarta Sans (`@expo-google-fonts/plus-jakarta-sans/<ağırlık>`; yalnızca kullanılan ağırlıklar) |
| Gradyan / grafik | `expo-linear-gradient`, `react-native-svg` (ilerleme halkası) |
| Animasyon | `react-native-reanimated` (kart giriş/çıkış, takvim açılıp kapanma) |
| Haptik | `expo-haptics` (web'de kapalı) |
| Güvenli alan | `react-native-safe-area-context` |

## Dizin Yapısı

```
App.tsx                 Kök: veri tabanı sürücüsü, AgendaProvider, yükleniyor ekranı
index.web.ts            Web girişi: sql.js yüklendikten sonra App'i kaydeder
src/
  components/           AgendaScreen (düzen), SummaryCard + ProgressRing, CalendarCard (hafta/ay),
                        NotesSection (başlık, filtre, boş durum), NoteCard, Composer (çok satırlı "Yeni not" kartı)
  constants/theme.ts    Açık/koyu palet, not renk etiketleri, yazı tipleri, ölçüler, usePalette()
  state/AgendaContext   Seçili gün, o günün notları, ekle/düzenle/tamamla/sil
  services/             calendar.ts (tarih yardımcıları), notes.ts (nottan saat ayıklama), haptics.ts
  db/                   schema.ts, migrate.ts, repository.ts, sürücüler
```

## Kurallar

1. **Sade kal.** Tek ekran; takvim + notlar. Yeni özellik bu akışı (gün seç → yaz) yavaşlatmamalı.
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
