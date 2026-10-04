# Chronos — Mimari Kurallar

Haftalık planlayıcı: her gün çizgili satırlı bir sütun; boş satıra dokun, yaz, Enter. Düzen
[WeekToDo](https://github.com/manuelernestog/weektodo)'dan esinlenir (GPL-3.0; kodu kopyalanmaz, yalnızca düzen).
Renkler sıcak "kağıt" dilinde (kullanıcı Claude arayüzünün sıcaklığını istedi): sıcak beyaz zemin, canlı turuncu vurgu (#E4572B), serif başlıklar, yuvarlak kutucuklar, bugünün sütunu yumuşak turuncu panelde.
Expo SDK 57 + React Native + TypeScript. Expo Go'da çalışır.

> 2026-10-04: Kullanıcı ilk "fiziksel defter" tasarımını (deri kapak, Skia kağıt, el yazısı, sayfa kıvırma,
> sesli not) eski bulup sade bir tasarım istedi. O sürüm git geçmişinde `d5a5458` commit'indedir.

Expo'ya özgü genel kurallar için `AGENTS.md` dosyasını da oku.

## Teknoloji

| Alan | Kütüphane |
|---|---|
| Yerel veri | `expo-sqlite` (web önizlemede `sql.js`, bkz. `src/db/sqliteDriver.web.ts`) |
| İkonlar | `@expo/vector-icons/Ionicons` (yalnızca Ionicons içe aktarılır; tüm paket web paketini şişirir) |
| Yazı tipi | Gövde sistem yazı tipi; başlıklar Fraunces (`@expo-google-fonts/fraunces/600SemiBold`, App.tsx'te yüklenir); ölçek `theme.ts` → `Type` |
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
                        DayColumn (gün sütunu: çizgili satırlar + hızlı ekleme satırı, TaskLine),
                        DayView (gün görünümü: saat çizelgesi, Gün boyu, şimdi çizgisi, kaydırarak gün değiştirme),
                        Bell (alarm zili sallanma animasyonu),
                        NoteSheet + NoteEditor (not ayrıntı kartı: açıklama, saat, renk, alarm),
                        AlarmList (üst çubuktaki zil + yaklaşan alarmlar), CalendarView (ay takvimi), Checkbox
  constants/theme.ts    Açık/koyu palet, not renk etiketleri, yazı tipleri, ölçüler, usePalette()
  state/AgendaContext   Seçili gün, hafta/gün görünümü (view), haftanın notları (weekNotes), ekle/düzenle/tamamla/sil/taşı
  services/             calendar.ts (tarih yardımcıları), recurrence.ts (tekrar kuralları), series.ts (tekrarları üretir),
                        dayLayout.ts (saat çizelgesi yerleşimi), notes.ts (saat ayıklama/normalleştirme,
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

10. **Tekrarlayan notlar gerçek notlardır.** `entries.repeat` (kural) ve `series_id` (zincir) ile bağlanır; zincirin en geç tarihli
    üyesi şablondur (`repo.listSeriesTails`). `materializeSeries` eksik tekrarları üretir ve AgendaContext'in yükleme efektinde
    sıraya girerek çağrılır (çift üretimi önler). Tekrarı değiştirmek/durdurmak `repo.changeSeries` ile yapılır (gelecekteki
    tamamlanmamış tekrarları siler). Tekrarların alarmı yalnızca 21 gün önceden kurulur (`reminders.ts`, iOS 64 bildirim sınırı).
11. **Bildirim düğmeleri** (`alarm` kategorisi: ertele/tamamla) uygulamayı öne açar; yanıtlar `listenAlarmActions` ile AgendaContext'te
    işlenir. Ertelenmiş bildirimin kimliği `snooze-<notId>`'dir; not tamamlanınca/silinince iptal edilir.
12. **Animasyonlar sakin kalır:** yalnızca hazır reanimated giriş animasyonları (FadeIn/ZoomIn), çıkış (exiting) animasyonu yok;
    web'de özel worklet animasyon kullanılmaz.
13. **Renk temaları** `theme.ts` → `AccentThemes`; seçim `settings` tablosunda (`accent`) saklanır. Bileşenler yine yalnızca `usePalette()` kullanır.
14. **Yedek** `services/backup.ts` (saf, testli); arama `services/search.ts`. Satır kaydırma yok: eylemler uzun basma menüsündedir (`RowMenu`),
    çünkü telefonda yatay kaydırma gün sayfalarına aittir. Sürükle-bırak ve ana ekran widget'ı yapılmadı (Expo Go'da yok / doğrulanamadı).
15. **Sade kal, süsleme ekleme:** kullanıcı halka, konfeti, ışık lekeleri ve çizimleri "fazla süslü" bulup kaldırttı (2026-10-04). Yeni görsel süs eklemeden önce sor.
16. **Kademeli giriş:** `TaskLine` satırları `index` ile sırayla belirir (FadeInDown + gecikme, en çok 8 adım); gün şeridinde seçili gün yaylanarak büyür.
17. **Doğal dil ve alt görevler saf servislerdir** (`naturalDate.ts`, `checklist.ts`; testli). Alt görevler şemayı değiştirmez: açıklamada
    `[ ] / [x]` satırları. Günlük özet bildirimleri `daily-<tarih>` kimliğiyle kurulur ve her değişiklikte baştan kurulur (`scheduleDailySummaries`).
18. **Süre, geri al, çoklu seçim:** şema v6 `entries.end_time` (yalnızca başlangıç saati varken geçerli; `blockDuration` en az 30 dk, varsayılan 45).
    Geri al AgendaContext'tedir (`offerUndo`, anlık görüntü + `repo.importEntries`; 5 sn'lik `UndoBar`). Çoklu seçim `selection/bulk*` ile yapılır
    (`SelectionBar`; uzun bas → "Seç"). Şablonlar `settings.templates` (JSON, `services/templates.ts`), bağlantılar `services/links.ts`.
    Bugün listesi `TodaySheet` (son 60 gün geciken + bugün). Koyu temada "saf siyah" `settings.pureBlack`, `paletteFor(..., black)`.

## Komutlar

```bash
npm install
npx expo start         # QR kodu Expo Go ile okut
npm run typecheck
npm test
npm run web:preview    # dist-web/ içine tarayıcı önizlemesi
```
