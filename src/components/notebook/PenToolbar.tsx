// Kalem araç çubuğu: mürekkep rengi, uç kalınlığı, geri al ve sayfa deseni.
// Her araç değişiminde mikro-haptik verilir.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PEN_PALETTE, PEN_SIZES } from '../../constants/theme';
import { useAgenda } from '../../state/AgendaContext';
import type { PageType } from '../../types/models';

const PAGE_TYPES: { type: PageType; label: string }[] = [
  { type: 'dot', label: '⠿' },
  { type: 'grid', label: '▦' },
  { type: 'lined', label: '☰' },
  { type: 'blank', label: '□' },
];

export interface PenToolbarProps {
  onUndo: () => void;
  canUndo: boolean;
  pageType: PageType;
  onPageType: (t: PageType) => void;
}

export default function PenToolbar({ onUndo, canUndo, pageType, onPageType }: PenToolbarProps) {
  const { penColor, penSize, setPen } = useAgenda();
  const next = PAGE_TYPES[(PAGE_TYPES.findIndex((p) => p.type === pageType) + 1) % PAGE_TYPES.length].type;
  return (
    <View style={styles.bar}>
      {PEN_PALETTE.map((c) => (
        <Pressable key={c} onPress={() => setPen(c)} hitSlop={4} accessibilityLabel={`Mürekkep ${c}`}>
          <View style={[styles.swatch, { backgroundColor: c }, c === penColor && styles.active]} />
        </Pressable>
      ))}
      <View style={styles.sep} />
      {PEN_SIZES.map((s) => (
        <Pressable key={s} onPress={() => setPen(penColor, s)} hitSlop={4} style={styles.sizeBtn}>
          <View
            style={[
              styles.nib,
              { width: s * 2 + 2, height: s * 2 + 2, borderRadius: s + 1, backgroundColor: penColor },
              s !== penSize && styles.dim,
            ]}
          />
        </Pressable>
      ))}
      <View style={styles.sep} />
      <Pressable onPress={() => onPageType(next)} accessibilityLabel="Sayfa deseni">
        <Text style={styles.icon}>{PAGE_TYPES.find((p) => p.type === pageType)?.label}</Text>
      </Pressable>
      <Pressable onPress={onUndo} disabled={!canUndo} accessibilityLabel="Geri al">
        <Text style={[styles.icon, !canUndo && styles.dim]}>↶</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 246, 236, 0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  active: { borderWidth: 3, borderColor: '#F3E9D2', transform: [{ scale: 1.15 }] },
  sep: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.15)' },
  sizeBtn: { width: 20, alignItems: 'center' },
  nib: {},
  dim: { opacity: 0.3 },
  icon: { fontSize: 20, color: '#3A3220' },
});
