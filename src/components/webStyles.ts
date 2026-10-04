// Web'e özgü stil düzeltmeleri. Tarayıcının varsayılan odak çerçevesi kendi odak tasarımımızla çakışır.

import { Platform, type TextStyle } from 'react-native';

export const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;
