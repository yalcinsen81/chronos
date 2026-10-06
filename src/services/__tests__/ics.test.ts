import type { EntryWithDate } from '../../db/repository';
import { buildIcs, parseIcs } from '../ics';

const base = {
  id: 'a1',
  date: '2026-10-07',
  time_slot: '14:30',
  end_time: '15:30',
  text_content: 'Toplantı, ekip\nGündem; bütçe',
  is_completed: false,
} as unknown as EntryWithDate;

describe('ics', () => {
  it('dışa aktarır ve geri okur (başlık, açıklama, süre)', () => {
    const ics = buildIcs([base], new Date('2026-10-06T10:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261007T143000');
    expect(ics).toContain('DTEND:20261007T153000');
    const back = parseIcs(ics);
    expect(back).toEqual([
      { id: 'a1', date: '2026-10-07', time: '14:30', endTime: '15:30', text: 'Toplantı, ekip\nGündem; bütçe' },
    ]);
  });

  it('saatsiz not tüm gün etkinliği olur', () => {
    const ics = buildIcs([{ ...base, time_slot: null, end_time: null, text_content: 'Rapor' } as EntryWithDate]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261007');
    expect(parseIcs(ics)).toEqual([{ id: 'a1', date: '2026-10-07', time: null, endTime: null, text: 'Rapor' }]);
  });

  it('bitiş yoksa 45 dakika varsayılır', () => {
    const ics = buildIcs([{ ...base, end_time: null } as EntryWithDate]);
    expect(ics).toContain('DTEND:20261007T151500');
  });

  it('Google tarzı UTC saati yerel saate çevirir ve satır katlamayı çözer', () => {
    const src = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART:20261007T100000Z',
      'SUMMARY:Uzun bir başlık satırı çok uzun oldu ve katlandı, devamı bir sonraki sa',
      ' tırda',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const [e] = parseIcs(src);
    expect(e.text).toBe('Uzun bir başlık satırı çok uzun oldu ve katlandı, devamı bir sonraki satırda');
    const local = new Date(Date.UTC(2026, 9, 7, 10, 0));
    expect(e.time).toBe(`${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`);
  });

  it('dışarıdan gelen etkinliğin kimliği kararlıdır (tekrar içe aktarma çift not üretmez)', () => {
    const src = 'BEGIN:VEVENT\nUID:xyz@google.com\nDTSTART:20261007T100000\nSUMMARY:A\nEND:VEVENT';
    expect(parseIcs(src)[0].id).toBe(parseIcs(src)[0].id);
    expect(parseIcs(src)[0].id.startsWith('ics-')).toBe(true);
  });

  it('geçersiz ya da boş metinde boş liste döner', () => {
    expect(parseIcs('merhaba')).toEqual([]);
  });
});
