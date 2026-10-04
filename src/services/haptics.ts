// Hafif dokunsal geri bildirim. Desteklenmeyen ortamlarda (web, simülatör) sessizce yutulur.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const haptics = {
  /** Gün seçimi, not tamamlama */
  select: () => safe(() => Haptics.selectionAsync()),
  /** Not ekleme / silme */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
