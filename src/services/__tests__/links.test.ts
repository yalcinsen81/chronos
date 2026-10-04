import { extractLinks, linkLabel } from '../links';

describe('links', () => {
  it('bağlantıları bulur, noktalamayı atar, tekrarları eler', () => {
    expect(extractLinks('Bak https://claude.ai/code, ayrıca www.ornek.com. Tekrar https://claude.ai/code')).toEqual([
      'https://claude.ai/code',
      'https://www.ornek.com',
    ]);
    expect(extractLinks('bağlantı yok')).toEqual([]);
  });
  it('kısa ad üretir', () => {
    expect(linkLabel('https://www.ornek.com/')).toBe('ornek.com');
    expect(linkLabel('https://ornek.com/cok/uzun/bir/yol/adresi/burada')).toHaveLength(28);
  });
});
