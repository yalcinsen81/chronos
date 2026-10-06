// Yedeği kaydeder: tarayıcıda .json dosyası indirir, telefonda paylaşım penceresini açar.

import { Platform, Share } from 'react-native';

export async function saveBackupFile(json: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronos-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: json, title: 'Chronos yedeği' });
}
