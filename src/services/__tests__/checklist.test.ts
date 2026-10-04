import { checklistProgress, joinChecklist, splitChecklist } from '../checklist';

describe('checklist', () => {
  it('ayırır ve geri birleştirir', () => {
    const body = 'Kısa açıklama\n[ ] Süt\n[x] Ekmek\n- [ ] Yumurta';
    const { text, items } = splitChecklist(body);
    expect(text).toBe('Kısa açıklama');
    expect(items).toEqual([
      { done: false, text: 'Süt' },
      { done: true, text: 'Ekmek' },
      { done: false, text: 'Yumurta' },
    ]);
    expect(joinChecklist(text, items)).toBe('Kısa açıklama\n[ ] Süt\n[x] Ekmek\n[ ] Yumurta');
  });
  it('boş maddeleri atar, maddesiz notu bozmaz', () => {
    expect(joinChecklist('düz metin', [{ done: false, text: '  ' }])).toBe('düz metin');
    expect(splitChecklist('sadece metin\nikinci satır')).toEqual({ text: 'sadece metin\nikinci satır', items: [] });
  });
  it('ilerleme sayar', () => {
    expect(checklistProgress('[x] a\n[ ] b\n[x] c')).toEqual({ done: 2, total: 3 });
    expect(checklistProgress('')).toEqual({ done: 0, total: 0 });
  });
});
