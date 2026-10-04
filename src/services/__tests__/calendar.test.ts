import {
  addDays,
  addMonths,
  diffDays,
  formatLong,
  formatWeekday,
  getMonthMatrix,
  getTimeSlots,
  isoWeekNumber,
  slotForTime,
  startOfWeek,
} from '../calendar';

describe('calendar', () => {
  it('gün ve ay ekler, ay sonuna sabitler', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('haftayı Pazartesi başlatır', () => {
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Pazar → önceki Pazartesi
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
  });

  it('ay matrisi 6x7 ve doğru hizalı', () => {
    const m = getMonthMatrix(2026, 9, '2026-10-04');
    expect(m).toHaveLength(6);
    m.forEach((w) => expect(w).toHaveLength(7));
    // 1 Ekim 2026 Perşembe → ilk satırın 4. hücresi
    expect(m[0][3]).toMatchObject({ iso: '2026-10-01', inMonth: true });
    expect(m[0][0].inMonth).toBe(false);
    expect(m.flat().find((c) => c.isToday)?.iso).toBe('2026-10-04');
  });

  it('Türkçe biçimlendirir', () => {
    expect(formatLong('2026-10-04')).toBe('4 Ekim 2026');
    expect(formatWeekday('2026-10-04')).toBe('Pazar');
  });

  it('ISO hafta numarası ve gün farkı', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2026-10-04')).toBe(40);
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2); // yaz saati geçişi
  });

  it('saat çizgileri', () => {
    expect(getTimeSlots(7, 9)).toEqual(['07:00', '08:00', '09:00']);
    expect(slotForTime('15:40')).toBe('15:00');
    expect(slotForTime('03:00')).toBe('07:00');
    expect(slotForTime('23:30')).toBe('22:00');
  });
});
