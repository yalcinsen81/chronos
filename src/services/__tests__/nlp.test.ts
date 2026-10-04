import { parseEntry } from '../nlp';

// Referans: 4 Ekim 2026 Pazar, 10:00
const REF = new Date(2026, 9, 4, 10, 0);

describe('parseEntry (Türkçe)', () => {
  it.each([
    ["Yarın 15:00'te Ahmet Bey ile bütçe toplantısı", '2026-10-05', '15:00', 'Ahmet Bey ile bütçe toplantısı'],
    ['bugün saat 9.30 diş hekimi', '2026-10-04', '09:30', 'Diş hekimi'],
    ["Ahmet Bey ile yarın saat 3'te görüşme", '2026-10-05', '15:00', 'Ahmet Bey ile görüşme'],
    ["akşam 7'de annemi ara", '2026-10-04', '19:00', 'Annemi ara'],
    ['öbür gün sabah 8 koşu', '2026-10-06', '08:00', 'Koşu'],
    ["Pazartesi günü 10:00'da sprint planlama", '2026-10-05', '10:00', 'Sprint planlama'],
    ['gelecek cuma doğum günü hediyesi al', '2026-10-09', null, 'Doğum günü hediyesi al'],
    ["15 Ekim'de vergi beyannamesi", '2026-10-15', null, 'Vergi beyannamesi'],
    ['3 gün sonra faturayı öde', '2026-10-07', null, 'Faturayı öde'],
    ['haftaya rapor teslimi', '2026-10-11', null, 'Rapor teslimi'],
    ['5 Mart 2027 saat 14:15 uçuş', '2027-03-05', '14:15', 'Uçuş'],
    ["öğlen İpek ile yemek", '2026-10-04', '12:00', 'İpek ile yemek'],
    ['saat 3 buçukta kargo gelecek', '2026-10-04', '15:30', 'Kargo gelecek'],
    ['1 Ocak yılbaşı', '2027-01-01', null, 'Yılbaşı'],
    ['12.11.2026 kongre', '2026-11-12', null, 'Kongre'],
  ])('%s', (text, date, time, action) => {
    const r = parseEntry(text, REF, 'tr');
    expect(r.date).toBe(date);
    expect(r.time).toBe(time);
    expect(r.action).toBe(action);
  });

  it('tarih içermeyen metni Inbox adayı olarak bırakır', () => {
    const r = parseEntry('3 elma al', REF);
    expect(r.date).toBeNull();
    expect(r.time).toBeNull();
    expect(r.action).toBe('3 elma al');
  });

  it('Türkçe metinde "sat" kelimesini Cumartesi sanmaz', () => {
    const r = parseEntry('eski bisikleti sat', REF);
    expect(r.date).toBeNull();
  });

  it('"2 kişi" gibi sayıları saat sanmaz', () => {
    const r = parseEntry("yarın 2 kişilik masa ayırt", REF);
    expect(r.date).toBe('2026-10-05');
    expect(r.time).toBeNull();
  });
});

describe('parseEntry (English)', () => {
  it('tomorrow at 3pm', () => {
    const r = parseEntry('Budget meeting with John tomorrow at 3pm', REF);
    expect(r.date).toBe('2026-10-05');
    expect(r.time).toBe('15:00');
    expect(r.action).toBe('Budget meeting with John');
  });
});
