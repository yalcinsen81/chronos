import { blockDuration, layoutDay, hourRange, timeToMinutes } from '../dayLayout';
import { nextOccurrence, occurrencesAfter, repeatLabel } from '../recurrence';

describe('nextOccurrence', () => {
  it('günlük, haftalık, aylık', () => {
    expect(nextOccurrence('2026-10-04', 'daily')).toBe('2026-10-05');
    expect(nextOccurrence('2026-10-04', 'weekly')).toBe('2026-10-11');
    expect(nextOccurrence('2026-10-31', 'monthly')).toBe('2026-11-30');
  });
  it("hafta içi: Cuma ve hafta sonu Pazartesi'ye atlar", () => {
    expect(nextOccurrence('2026-10-01', 'weekdays')).toBe('2026-10-02'); // Perşembe → Cuma
    expect(nextOccurrence('2026-10-02', 'weekdays')).toBe('2026-10-05'); // Cuma → Pazartesi
    expect(nextOccurrence('2026-10-03', 'weekdays')).toBe('2026-10-05'); // Cumartesi → Pazartesi
    expect(nextOccurrence('2026-10-04', 'weekdays')).toBe('2026-10-05'); // Pazar → Pazartesi
  });
});

describe('occurrencesAfter', () => {
  it('son günden sonrasını, bitiş dahil üretir', () => {
    expect(occurrencesAfter('2026-10-04', 'daily', '2026-10-07')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(occurrencesAfter('2026-10-04', 'weekly', '2026-10-25')).toEqual(['2026-10-11', '2026-10-18', '2026-10-25']);
  });
  it('bitiş tarihi gelmişse boş döner ve üst sınıra uyar', () => {
    expect(occurrencesAfter('2026-10-04', 'daily', '2026-10-04')).toEqual([]);
    expect(occurrencesAfter('2026-10-04', 'daily', '2030-01-01', 5)).toHaveLength(5);
  });
  it('etiketler', () => {
    expect(repeatLabel(null)).toBe('Tekrar yok');
    expect(repeatLabel('weekdays')).toBe('Hafta içi');
  });
});

describe('layoutDay', () => {
  it('çakışmayan bloklar tek şeritte kalır', () => {
    const r = layoutDay([
      { id: 'a', minutes: timeToMinutes('09:00') },
      { id: 'b', minutes: timeToMinutes('11:00') },
    ]);
    expect(r.map((p) => [p.lane, p.lanes])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });
  it('çakışanlar yan yana şeritlere dizilir', () => {
    const r = layoutDay([
      { id: 'a', minutes: timeToMinutes('09:00') },
      { id: 'b', minutes: timeToMinutes('09:20') },
      { id: 'c', minutes: timeToMinutes('09:30') },
      { id: 'd', minutes: timeToMinutes('12:00') },
    ]);
    const by = Object.fromEntries(r.map((p) => [p.id, p]));
    expect(by.a).toMatchObject({ lane: 0, lanes: 3 });
    expect(by.b).toMatchObject({ lane: 1, lanes: 3 });
    expect(by.c).toMatchObject({ lane: 2, lanes: 3 });
    expect(by.d).toMatchObject({ lane: 0, lanes: 1 });
  });
  it('saat aralığı notlara göre genişler', () => {
    expect(hourRange([])).toEqual({ start: 7, end: 22 });
    expect(hourRange([timeToMinutes('05:30'), timeToMinutes('23:10')])).toEqual({ start: 5, end: 24 });
  });
});

describe('süre (bitiş saati)', () => {
  it('blok süresi bitişe göre, en az 30 dk; bitiş yoksa varsayılan', () => {
    expect(blockDuration(540, 630)).toBe(90);
    expect(blockDuration(540, 550)).toBe(30);
    expect(blockDuration(540, null)).toBe(45);
    expect(blockDuration(540, 500)).toBe(45);
  });
  it('uzun blok sonraki notu yan şeride iter', () => {
    const r = layoutDay([
      { id: 'a', minutes: 540, duration: 120 },
      { id: 'b', minutes: 600 },
    ]);
    expect(r.map((p) => [p.id, p.lane, p.lanes])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ]);
  });
});
