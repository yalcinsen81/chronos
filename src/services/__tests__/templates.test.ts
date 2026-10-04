import { itemsFromLines, parseTemplates, serializeTemplates, templateToText } from '../templates';

describe('templates', () => {
  it('kaydeder, okur, bozuk veriyi atar', () => {
    const list = [{ id: 'a', title: 'Alışveriş', items: ['Süt', 'Ekmek'] }];
    expect(parseTemplates(serializeTemplates(list))).toEqual(list);
    expect(parseTemplates(null)).toEqual([]);
    expect(parseTemplates('{bozuk')).toEqual([]);
    expect(parseTemplates('[{"id":1}]')).toEqual([]);
  });
  it('şablondan not metni üretir', () => {
    expect(templateToText({ id: 'a', title: 'Alışveriş', items: ['Süt', 'Ekmek'] })).toBe(
      'Alışveriş\n[ ] Süt\n[ ] Ekmek',
    );
    expect(templateToText({ id: 'b', title: 'Sade', items: [] })).toBe('Sade');
  });
  it('satırlardan madde çıkarır', () => {
    expect(itemsFromLines(' Süt \n\nEkmek\n')).toEqual(['Süt', 'Ekmek']);
  });
});
