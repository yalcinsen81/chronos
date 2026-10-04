// Mikro-haptik geri bildirimler. Hata durumunda sessizce yutulur (simülatör / desteklemeyen cihaz).

import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => p.catch(() => undefined);

export const haptics = {
  /** Sayfa çevirme: kağıdın tok hissi */
  pageTurn: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Kalem / araç değişimi */
  toolChange: () => safe(Haptics.selectionAsync()),
  /** Sürüklemeye başlama (Post-it kaldırma) */
  pickUp: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Bırakma / kaydetme */
  drop: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Elastik bandın çıkması */
  snap: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
