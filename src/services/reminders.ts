// Alarm: notun saatinde (veya seçilen süre önce) sesli yerel bildirim.
// expo-notifications yerel bildirimleri Expo Go'da da çalışır. Android'de yüksek öncelikli "alarmlar" kanalı açılır.
// Not: Telefonun saat uygulaması gibi kapatılana dek çalan bir alarm değil; sesli, öne çıkan bildirimdir.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { EntryWithDate } from '../db/repository';
import { splitNote } from './notes';
import { reminderFireDate, reminderLabel, shouldSchedule } from './reminderTime';

const CHANNEL_ID = 'alarms';
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
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

export async function cancelReminder(notificationId: string | null) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}

/** Notun alarmını (yeniden) kurar; eski bildirimi iptal eder. Yeni bildirim kimliğini ya da null döner. */
export async function scheduleReminder(note: EntryWithDate): Promise<string | null> {
  await cancelReminder(note.notification_id);
  if (note.is_completed) return null;
  const fire = reminderFireDate(note.date, note.time_slot, note.reminder_minutes);
  if (!shouldSchedule(fire)) return null;
  await setup();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return null;
  const { title, body } = splitNote(note.text_content);
  const when = note.reminder_minutes ? ` (${reminderLabel(note.reminder_minutes)})` : '';
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${note.time_slot} · ${title || body}`,
      body: body ? body.split('\n')[0] : `Chronos hatırlatması${when}`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { entryId: note.id, date: note.date },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId: CHANNEL_ID },
  });
}
