// Alarm: notun saatinde (veya seçilen süre önce) sesli yerel bildirim.
// expo-notifications yerel bildirimleri Expo Go'da da çalışır. Android'de yüksek öncelikli "alarmlar" kanalı açılır.
// Not: Telefonun saat uygulaması gibi kapatılana dek çalan bir alarm değil; sesli, öne çıkan bildirimdir.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { EntryWithDate } from '../db/repository';
import { splitNote } from './notes';
import { reminderFireDate, reminderLabel, shouldSchedule } from './reminderTime';

const CHANNEL_ID = 'alarms';
const CATEGORY_ID = 'alarm';
const SNOOZE_MINUTES = 10;
/** Tekrarlayan notların alarmı yalnızca bu kadar gün öncesinden kurulur (iOS en fazla 64 bekleyen bildirim tutar) */
const SERIES_WINDOW_DAYS = 21;
let ready = false;

async function setup() {
  if (ready) return;
  ready = true;
  // Uygulama açıkken de bildirim gösterilsin ve ses çalsın
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  // Bildirimdeki düğmeler: ertele ve tamamla (uygulama açılır, işlem listenAlarmActions ile yapılır)
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: 'snooze', buttonTitle: `${SNOOZE_MINUTES} dk ertele`, options: { opensAppToForeground: true } },
    { identifier: 'done', buttonTitle: 'Tamamla', options: { opensAppToForeground: true } },
  ]).catch(() => undefined);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alarmlar',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 250, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

export const remindersSupported = true;

/** Bildirim iznini ister; verildiyse true */
export async function requestReminderPermission(): Promise<boolean> {
  await setup();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return res.granted;
}

export async function cancelReminder(notificationId: string | null) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}

const snoozeId = (entryId: string) => `snooze-${entryId}`;

/** Ertelenmiş bildirimi iptal eder (not tamamlanınca ya da silinince) */
export async function cancelSnooze(entryId: string) {
  await Notifications.cancelScheduledNotificationAsync(snoozeId(entryId)).catch(() => undefined);
}

function contentFor(note: EntryWithDate): Notifications.NotificationContentInput {
  const { title, body } = splitNote(note.text_content);
  const when = note.reminder_minutes ? ` (${reminderLabel(note.reminder_minutes)})` : '';
  return {
    title: `⏰ ${note.time_slot} · ${title || body}`,
    body: body ? body.split('\n')[0] : `Chronos hatırlatması${when}`,
    sound: 'default',
    priority: Notifications.AndroidNotificationPriority.MAX,
    categoryIdentifier: CATEGORY_ID,
    data: { entryId: note.id, date: note.date },
  };
}

/** Notun alarmını (yeniden) kurar; eski bildirimi iptal eder. Yeni bildirim kimliğini ya da null döner. */
export async function scheduleReminder(note: EntryWithDate): Promise<string | null> {
  await cancelReminder(note.notification_id);
  if (note.is_completed) {
    await cancelSnooze(note.id);
    return null;
  }
  const fire = reminderFireDate(note.date, note.time_slot, note.reminder_minutes);
  if (!shouldSchedule(fire)) return null;
  // Tekrarlayan notun uzak tarihli tekrarları yaklaşınca (uygulama açıldıkça) kurulur
  if (note.series_id && fire.getTime() > Date.now() + SERIES_WINDOW_DAYS * 86_400_000) return null;
  await setup();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: contentFor(note),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId: CHANNEL_ID },
  });
}

/** Alarmı birkaç dakika sonraya erteler (aynı not için tek ertelenmiş bildirim tutulur) */
export async function snoozeReminder(note: EntryWithDate, minutes = SNOOZE_MINUTES): Promise<void> {
  await setup();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: snoozeId(note.id),
    content: contentFor(note),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60_000),
      channelId: CHANNEL_ID,
    },
  });
}

export interface AlarmAction {
  entryId: string;
  date: string | null;
  /** open: bildirime dokunuldu; snooze / done: bildirimdeki düğmeler */
  action: 'open' | 'snooze' | 'done';
}

const handled = new Set<string>();

/** Bildirime dokunma ve bildirim düğmelerini dinler; uygulama kapalıyken gelen son yanıtı da işler. */
export function listenAlarmActions(handler: (a: AlarmAction) => void): () => void {
  void setup();
  const handle = (r: Notifications.NotificationResponse) => {
    const data = r.notification.request.content.data as { entryId?: string; date?: string | null } | undefined;
    if (!data?.entryId) return;
    // Aynı yanıt hem başlangıçta hem dinleyiciden gelebilir
    const key = `${r.notification.request.identifier}:${r.actionIdentifier}:${r.notification.date}`;
    if (handled.has(key)) return;
    handled.add(key);
    const action = r.actionIdentifier === 'snooze' ? 'snooze' : r.actionIdentifier === 'done' ? 'done' : 'open';
    handler({ entryId: data.entryId, date: data.date ?? null, action });
    Notifications.clearLastNotificationResponse();
  };
  Notifications.getLastNotificationResponseAsync()
    .then((r) => r && handle(r))
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

const SUMMARY_PREFIX = 'daily-';
const SUMMARY_CHANNEL = 'summary';
const SUMMARY_DAYS = 7;

export interface DaySummary {
  date: string; // YYYY-MM-DD
  count: number; // tamamlanmamış not sayısı
  titles: string[]; // ilk birkaç not başlığı
}

/**
 * Günlük özet bildirimi: seçilen saatte "Bugün N notun var". Yerel bildirim içeriği sonradan değişmediği için
 * önümüzdeki 7 gün, notlar her değiştiğinde ve uygulama her açıldığında güncel sayılarla yeniden kurulur.
 * hour null ise özetler kapatılır. Notu olmayan güne bildirim kurulmaz.
 */
export async function scheduleDailySummaries(hour: number | null, days: DaySummary[]): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const n of pending) {
    if (n.identifier.startsWith(SUMMARY_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined);
    }
  }
  if (hour == null) return;
  await setup();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SUMMARY_CHANNEL, {
      name: 'Günlük özet',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  for (const d of days.slice(0, SUMMARY_DAYS)) {
    if (d.count === 0) continue;
    const [y, m, day] = d.date.split('-').map(Number);
    const fire = new Date(y, m - 1, day, hour, 0, 0);
    if (fire.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${SUMMARY_PREFIX}${d.date}`,
      content: {
        title: `Bugün ${d.count} notun var`,
        body: d.titles.slice(0, 3).join(' · '),
        data: { date: d.date },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId: SUMMARY_CHANNEL },
    });
  }
}
