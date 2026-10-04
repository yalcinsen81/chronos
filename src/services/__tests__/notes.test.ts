import { joinNote, normalizeTime, parseNote, splitNote } from '../notes';

describe('parseNote', () => {
  it('baştaki saati ayırır', () => {
    expect(parseNote('14:30 Diş hekimi')).toEqual({ text: 'Diş hekimi', time: '14:30' });
    expect(parseNote('9.05 - Koşu')).toEqual({ text: 'Koşu', time: '09:05' });
    expect(parseNote("saat 15:00'te Ahmet ile toplantı")).toEqual({ text: 'Ahmet ile toplantı', time: '15:00' });
  });

  it('sondaki saati ayırır', () => {
    expect(parseNote('Toplantı 10:00')).toEqual({ text: 'Toplantı', time: '10:00' });
  });

  it('saat yoksa veya cümle içindeyse metne dokunmaz', () => {
    expect(parseNote('Süt al')).toEqual({ text: 'Süt al', time: null });
    expect(parseNote('3.5 kilo un al')).toEqual({ text: '3.5 kilo un al', time: null });
    expect(parseNote('Saat 12:00 ile 13:00 arası öğle yemeği')).toEqual({
      text: 'Saat 12:00 ile 13:00 arası öğle yemeği',
      time: null,
    });
    expect(parseNote('12:00')).toEqual({ text: '12:00', time: null });
  });

  it('çok satırlı notta baştaki saati ayırır, satırları korur', () => {
    expect(parseNote('14:30 Toplantı\n- bütçe\n- takvim')).toEqual({ text: 'Toplantı\n- bütçe\n- takvim', time: '14:30' });
  });
});

describe('normalizeTime', () => {
  it('farklı yazımları HH:mm yapar', () => {
    expect(normalizeTime('9')).toBe('09:00');
    expect(normalizeTime('930')).toBe('09:30');
    expect(normalizeTime('1415')).toBe('14:15');
    expect(normalizeTime('14.5')).toBe('14:05');
    expect(normalizeTime('8:45')).toBe('08:45');
  });
  it('boşta null, geçersizde undefined', () => {
    expect(normalizeTime('  ')).toBeNull();
    expect(normalizeTime('25:00')).toBeUndefined();
    expect(normalizeTime('öğlen')).toBeUndefined();
  });
});

describe('splitNote / joinNote', () => {
  it('ilk satır başlık, kalanı açıklama', () => {
    expect(splitNote('Toplantı\n- bütçe\n- takvim')).toEqual({ title: 'Toplantı', body: '- bütçe\n- takvim' });
    expect(splitNote('Süt al')).toEqual({ title: 'Süt al', body: '' });
    expect(joinNote(' Toplantı ', ' - bütçe ')).toBe('Toplantı\n- bütçe');
    expect(joinNote('', 'sadece açıklama')).toBe('sadece açıklama');
  });
});
