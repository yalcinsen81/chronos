# Chronos — Mimari Kurallar

Haftalık planlayıcı: her gün çizgili satırlı bir sütun; boş satıra dokun, yaz, Enter. Düzen
[WeekToDo](https://github.com/manuelernestog/weektodo)'dan esinlenir (GPL-3.0; kodu kopyalanmaz, yalnızca düzen).
Renkler sıcak "kağıt" dilinde (kullanıcı Claude arayüzünün sıcaklığını istedi): fildişi zemin, kil vurgu, serif başlıklar.
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
| Alarm | `expo-notifications` yerel bildirim (Expo Go'da çalışır; web'de `reminders.web.ts` boş) |
| Haptik | `expo-haptics` (web'de kapalı) |
| Güvenli alan | `react-native-safe-area-context` |

## Dizin Yapısı

```
App.tsx                 Kök: veri tabanı sürücüsü, AgendaProvider, yükleniyor ekranı
index.web.ts            Web girişi: sql.js yüklendikten sonra App'i kaydeder
src/
  components/           AgendaScreen (geniş: yan yana sütunlar, telefon: sayfa sayfa günler),
                        WeekHeader (ay/hafta, oklar, Bugün, gün şeridi, ay takvimi penceresi),
                        DayColumn (gün sütunu: çizgili satırlar + hızlı ekleme satırı),
                        NoteSheet + NoteEditor (not ayrıntı kartı: açıklama, saat, renk, alarm),
                        AlarmList (üst çubuktaki zil + yaklaşan alarmlar), CalendarView (ay takvimi), Checkbox
  constants/theme.ts    Açık/koyu palet, not renk etiketleri, yazı tipleri, ölçüler, usePalette()
  state/AgendaContext   Seçili gün, haftanın 7 günü ve notları (weekNotes), ekle/düzenle/tamamla/sil
  services/             calendar.ts (tarih yardımcıları), notes.ts (saat ayıklama/normalleştirme,
                        başlık+açıklama: ilk satır başlık), reminderTime.ts (alarm anı, saf),
                        reminders.ts (bildirim kurma/iptal), haptics.ts
  db/                   schema.ts, migrate.ts, repository.ts, sürücüler
```

## Kurallar

1. **Sade kal.** Tek ekran; hafta sütunları. Yeni özellik "satıra dokun → yaz → Enter" akışını yavaşlatmamalı.
2. **Renkler `theme.ts`'den.** Bileşenlerde renk kodu yazılmaz; `usePalette()` ile açık/koyu temaya uyulur.
3. **Şema değişikliği** `schema.ts`'te SCHEMA_VERSION artırılıp `UPGRADES`'e ALTER adımı eklenerek yapılır.
4. **Local-first.** Tüm veri SQLite'ta; ağ bağımlılığı yok. UI SQL yazmaz, `repository.ts` kullanır.
5. **Servisler saf kalır** ve birim testle doğrulanır (`src/services/__tests__`).
6. **Expo Go uyumu korunur.** Expo Go'da olmayan native modül eklenmez; gerekiyorsa önce kullanıcıya sorulur.
7. Paket eklerken `npx expo install <paket>`; ağ kısıtlıysa sürümü `node_modules/expo/bundledNativeModules.json`'dan al.
8. Kod yorumları Türkçe yazılır.

9. **Alarm tutarlılığı:** Notu değiştiren her işlem AgendaContext üzerinden geçer; `syncReminder` bildirimi
   veri tabanının son haline göre yeniden kurar ve `notification_id`'yi saklar. Açılışta tüm alarmlar yeniden kurulur.
   Bu, gerçek bir "çalar saat" değil, sesli ve yüksek öncelikli bildirimdir.

## Komutlar

```bash
npm install
npx expo start         # QR kodu Expo Go ile okut
npm run typecheck
npm test
npm run web:preview    # dist-web/ içine tarayıcı önizlemesi
```
