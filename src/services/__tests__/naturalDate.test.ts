import { parseSmart } from '../naturalDate';

const T = '2026-10-04'; // Pazar

describe('parseSmart', () => {
  it('yarın + saat + metin', () => {
    expect(parseSmart('yarın 15:00 diş hekimi', T)).toEqual({ text: 'diş hekimi', time: '15:00', date: '2026-10-05' });
  });
  it('sondaki gün ve saat', () => {
    expect(parseSmart('Diş hekimi yarın 15:00', T)).toEqual({ text: 'Diş hekimi', time: '15:00', date: '2026-10-05' });
  });
  it('bugün, öbür gün, N gün sonra, haftaya', () => {
    expect(parseSmart('Bugün süt al', T).date).toBe(T);
    expect(parseSmart('öbür gün rapor', T).date).toBe('2026-10-06');
    expect(parseSmart('3 gün sonra rapor', T).date).toBe('2026-10-07');
    expect(parseSmart('2 hafta sonra rapor', T).date).toBe('2026-10-18');
    expect(parseSmart('haftaya rapor', T).date).toBe('2026-10-11');
  });
  it('gün adı: bu haftaki sonraki gün, haftaya = gelecek hafta', () => {
    expect(parseSmart('cuma toplantı 10.30', T)).toEqual({ text: 'toplantı', time: '10:30', date: '2026-10-09' });
    expect(parseSmart('pazar koşu', T).date).toBe(T);
    expect(parseSmart('haftaya salı sunum', T).date).toBe('2026-10-06');
    expect(parseSmart('Pazartesi ekip toplantısı', T).date).toBe('2026-10-05');
  });
  it('gün ay (yıl yoksa geçmişse gelecek yıl)', () => {
    expect(parseSmart('15 Ekim doğum günü', T).date).toBe('2026-10-15');
    expect(parseSmart('2 Ekim fatura', T).date).toBe('2027-10-02');
    expect(parseSmart('20 Aralık 2027 uçuş', T).date).toBe('2027-12-20');
    expect(parseSmart('31 Şubat bir şey', T).date).toBeNull();
  });
  it('gün ifadesi yoksa ya da yalnızca o yazıldıysa dokunmaz', () => {
    expect(parseSmart('Süt ve ekmek al', T)).toEqual({ text: 'Süt ve ekmek al', time: null, date: null });
    expect(parseSmart('yarın', T)).toEqual({ text: 'yarın', time: null, date: null });
    expect(parseSmart('Bu cuma namazı hazırlığı', T).date).toBeNull();
  });
  it('sözcükle yazılan saat: saat 3 te toplantı', () => {
    expect(parseSmart('saat 3 te toplantı', T)).toEqual({ text: 'toplantı', time: '15:00', date: null });
    expect(parseSmart("saat 3'te toplantı", T).time).toBe('15:00');
    expect(parseSmart('toplantı saat 3 buçuk', T)).toEqual({ text: 'toplantı', time: '15:30', date: null });
    expect(parseSmart('saat 9 da kahvaltı', T).time).toBe('09:00');
    expect(parseSmart('akşam 8de yemek', T).time).toBe('20:00');
    expect(parseSmart('sabah 6 da koşu', T).time).toBe('06:00');
    expect(parseSmart('yarın saat 4 te sunum', T)).toEqual({ text: 'sunum', time: '16:00', date: '2026-10-05' });
    expect(parseSmart('toplantı 3te', T)).toEqual({ text: 'toplantı', time: '15:00', date: null });
  });
  it('tek başına sayı saat sayılmaz', () => {
    expect(parseSmart('3 elma al', T)).toEqual({ text: '3 elma al', time: null, date: null });
    expect(parseSmart('Kitap 12', T).time).toBeNull();
  });
  it('yalnızca saat eski davranışla çalışır', () => {
    expect(parseSmart('14:30 Diş hekimi', T)).toEqual({ text: 'Diş hekimi', time: '14:30', date: null });
  });
});
