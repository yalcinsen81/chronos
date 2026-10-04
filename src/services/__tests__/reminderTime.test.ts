import { reminderFireDate, reminderLabel, shouldSchedule } from '../reminderTime';

describe('reminderFireDate', () => {
  it('saatten dakika düşerek yerel tarihi hesaplar', () => {
    expect(reminderFireDate('2026-10-06', '14:30', 15)).toEqual(new Date(2026, 9, 6, 14, 15));
    expect(reminderFireDate('2026-10-06', '14:30', 0)).toEqual(new Date(2026, 9, 6, 14, 30));
  });
  it('gün ve ay sınırını geçer', () => {
    expect(reminderFireDate('2026-11-01', '00:10', 30)).toEqual(new Date(2026, 9, 31, 23, 40));
    expect(reminderFireDate('2026-10-06', '09:00', 1440)).toEqual(new Date(2026, 9, 5, 9, 0));
  });
  it('saat veya alarm yoksa null', () => {
    expect(reminderFireDate('2026-10-06', null, 15)).toBeNull();
    expect(reminderFireDate('2026-10-06', '10:00', null)).toBeNull();
  });
});

describe('shouldSchedule / reminderLabel', () => {
  it('geçmişteki alarmı kurmaz', () => {
    const now = new Date(2026, 9, 4, 12, 0);
    expect(shouldSchedule(new Date(2026, 9, 4, 11, 59), now)).toBe(false);
    expect(shouldSchedule(new Date(2026, 9, 4, 12, 5), now)).toBe(true);
    expect(shouldSchedule(null, now)).toBe(false);
  });
  it('etiketler', () => {
    expect(reminderLabel(null)).toBe('Alarm yok');
    expect(reminderLabel(15)).toBe('15 dk önce');
    expect(reminderLabel(60, true)).toBe('1 sa');
  });
});
