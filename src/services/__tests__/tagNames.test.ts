import { MAX_TAG_NAME, parseTagNames, tagLabel, withTagName } from '../tagNames';

describe('tagNames', () => {
  it('bozuk girdiyi boş sayar', () => {
    expect(parseTagNames(null)).toEqual({});
    expect(parseTagNames('{')).toEqual({});
    expect(parseTagNames('[1]')).toEqual({});
  });
  it('yalnızca dolu metinleri alır ve kırpar', () => {
    const raw = JSON.stringify({ blue: '  İş ', red: '', green: 5, purple: 'x'.repeat(40) });
    const out = parseTagNames(raw);
    expect(out.blue).toBe('İş');
    expect(out.red).toBeUndefined();
    expect(out.green).toBeUndefined();
    expect(out.purple).toHaveLength(MAX_TAG_NAME);
  });
  it('ekler, boş adla siler, eskiyi değiştirmez', () => {
    const a = withTagName({}, 'blue', ' Ev ');
    expect(a).toEqual({ blue: 'Ev' });
    expect(withTagName(a, 'blue', '  ')).toEqual({});
    expect(a).toEqual({ blue: 'Ev' });
  });
  it('adı yoksa varsayılanı gösterir', () => {
    expect(tagLabel({ blue: 'İş' }, 'blue', 'Mavi')).toBe('İş');
    expect(tagLabel({}, 'red', 'Kırmızı')).toBe('Kırmızı');
  });
});
