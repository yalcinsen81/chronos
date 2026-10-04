// Şablonlar: sık yazdığın notları (örneğin "Haftalık alışveriş" + maddeleri) bir dokunuşla seçili güne ekler.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Space, Type, usePalette } from '../constants/theme';
import { formatWeekday } from '../services/calendar';
import {
  itemsFromLines,
  parseTemplates,
  serializeTemplates,
  templateToText,
  type Template,
} from '../services/templates';
import { useAgenda } from '../state/AgendaContext';
import { webNoOutline } from './webStyles';

export default function TemplatesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = usePalette();
  const { repo, saveNote, date } = useAgenda();
  const [list, setList] = useState<Template[]>([]);
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState('');
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAdded(null);
    repo.getSetting('templates').then((v) => setList(parseTemplates(v)));
  }, [visible, repo]);

  const persist = async (next: Template[]) => {
    setList(next);
    await repo.setSetting('templates', serializeTemplates(next));
  };

  const create = async () => {
    if (!title.trim()) return;
    await persist([...list, { id: `t${Date.now()}`, title: title.trim(), items: itemsFromLines(lines) }]);
    setTitle('');
    setLines('');
  };

  const use = async (t: Template) => {
    await saveNote({ text: templateToText(t), time: null, color: null, reminder: null, date });
    setAdded(t.id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.shadow }]} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: c.card, borderColor: c.separator }]}
          onPress={() => undefined}
        >
          <View style={styles.head}>
            <Ionicons name="copy-outline" size={20} color={c.accent} />
            <View style={styles.flex}>
              <Text style={[Type.title, { color: c.text }]}>Şablonlar</Text>
              <Text style={[Type.caption, { color: c.textMuted }]}>{formatWeekday(date)} gününe eklenir</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {list.length === 0 && (
              <Text style={[Type.sub, { color: c.textMuted }]}>Henüz şablon yok. Aşağıdan bir tane oluştur.</Text>
            )}
            {list.map((t) => (
              <View key={t.id} style={[styles.row, { borderBottomColor: c.separator }]}>
                <Pressable
                  style={styles.flex}
                  onPress={() => use(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title} şablonunu ekle`}
                >
                  <Text style={[Type.sub, { color: c.text }]}>{t.title}</Text>
                  <Text numberOfLines={1} style={[Type.caption, { color: c.textMuted }]}>
                    {added === t.id ? 'Eklendi' : t.items.length ? t.items.join(' · ') : 'Maddesiz not'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => persist(list.filter((x) => x.id !== t.id))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title} şablonunu sil`}
                >
                  <Ionicons name="trash-outline" size={18} color={c.textFaint} />
                </Pressable>
              </View>
            ))}

            <Text style={[Type.micro, styles.section, { color: c.textMuted }]}>YENİ ŞABLON</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Başlık (örneğin Haftalık alışveriş)"
              placeholderTextColor={c.textFaint}
              style={[Type.sub, styles.field, webNoOutline, { color: c.text, backgroundColor: c.fill }]}
              accessibilityLabel="Şablon başlığı"
            />
            <TextInput
              value={lines}
              onChangeText={setLines}
              multiline
              placeholder={'Maddeler, her satıra bir tane\nSüt\nEkmek'}
              placeholderTextColor={c.textFaint}
              style={[Type.sub, styles.field, styles.area, webNoOutline, { color: c.text, backgroundColor: c.fill }]}
              accessibilityLabel="Şablon maddeleri"
            />
            <Pressable
              onPress={create}
              disabled={!title.trim()}
              accessibilityRole="button"
              accessibilityLabel="Şablonu kaydet"
              style={[styles.save, { backgroundColor: c.accent, opacity: title.trim() ? 1 : 0.4 }]}
            >
              <Text style={[Type.bodyBold, { color: c.onAccent }]}>Şablonu kaydet</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.lg, paddingBottom: Space.sm },
  body: { paddingHorizontal: Space.lg, paddingBottom: Space.lg, gap: Space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  section: { marginTop: Space.md, letterSpacing: 0.8 },
  field: { borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.sm, minHeight: 44 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  save: { height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Space.xs },
});
