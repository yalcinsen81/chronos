import { reminderFireDate, reminderLabel, shouldSchedule, upcomingAlarms } from '../reminderTime';

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

describe('upcomingAlarms', () => {
  const now = new Date(2026, 9, 4, 12, 0);
  const e = (id: string, date: string, time: string | null, rem: number | null, done = false) => ({
    id,
    date,
    time_slot: time,
    reminder_minutes: rem,
    is_completed: done,
  });
  it('geçmiş, tamamlanmış ve saatsizleri atar; en yakını önce sıralar', () => {
    const list = upcomingAlarms(
      [
        e('gecmis', '2026-10-04', '11:00', 0),
        e('yarin', '2026-10-05', '09:00', 15),
        e('bugun', '2026-10-04', '18:00', 30),
        e('bitti', '2026-10-04', '19:00', 0, true),
        e('saatsiz', '2026-10-06', null, 0),
      ],
      now,
    );
    expect(list.map((x) => x.id)).toEqual(['bugun', 'yarin']);
    expect(list[0].fireAt).toEqual(new Date(2026, 9, 4, 17, 30));
  });
});
