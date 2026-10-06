import {
  formatClock,
  setClock12,
  setWeekStartsOnSunday,
  startOfIsoWeek,
  startOfWeek,
  weekdayLabels,
} from '../calendar';

afterEach(() => {
  setWeekStartsOnSunday(false);
  setClock12(false);
});

describe('hafta başlangıcı ayarı', () => {
  it('varsayılan Pazartesi: 2026-10-07 (Çarşamba) → 2026-10-05', () => {
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05');
    expect(weekdayLabels()[0]).toBe('Pzt');
  });
  it('Pazar başlangıcı: aynı gün → 2026-10-04 (Pazar)', () => {
    setWeekStartsOnSunday(true);
    expect(startOfWeek('2026-10-07')).toBe('2026-10-04');
    expect(startOfWeek('2026-10-04')).toBe('2026-10-04');
    expect(weekdayLabels()[0]).toBe('Paz');
    expect(weekdayLabels()).toHaveLength(7);
  });
  it('ISO haftası ayardan etkilenmez', () => {
    setWeekStartsOnSunday(true);
    expect(startOfIsoWeek('2026-10-07')).toBe('2026-10-05');
  });
});

describe('saat gösterimi', () => {
  it('24 saat değişmez', () => expect(formatClock('14:30')).toBe('14:30'));
  it('12 saat ÖÖ/ÖS', () => {
    setClock12(true);
    expect(formatClock('00:05')).toBe('12:05 ÖÖ');
    expect(formatClock('09:00')).toBe('9:00 ÖÖ');
    expect(formatClock('12:00')).toBe('12:00 ÖS');
    expect(formatClock('15:30')).toBe('3:30 ÖS');
  });
});
