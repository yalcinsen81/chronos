import type { EntryWithDate } from '../../db/repository';
import { buildBackup, parseBackup } from '../backup';
import { fold, searchNotes } from '../search';

const entry = (o: Partial<EntryWithDate>): EntryWithDate => ({
  id: 'a',
  page_id: 'p',
  time_slot: null,
  end_time: null,
  text_content: 'Not',
  is_completed: false,
  audio_path: null,
  is_inbox: false,
  created_at: 1,
  color: null,
  reminder_minutes: null,
  notification_id: null,
  repeat: null,
  series_id: null,
  date: '2026-10-04',
  ...o,
});

describe('backup', () => {
  it('yedek gidiş dönüş korunur', () => {
    const b = buildBackup([
      entry({
        id: 'x',
        time_slot: '09:30',
        text_content: 'İlaç\nSabah',
        color: 'red',
        reminder_minutes: 15,
        repeat: 'daily',
        series_id: 'x',
        is_completed: true,
      }),
    ]);
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.entries[0]).toMatchObject({
        id: 'x',
        time: '09:30',
        text: 'İlaç\nSabah',
        done: true,
        color: 'red',
        reminder: 15,
        repeat: 'daily',
        series: 'x',
      });
  });
  it("geçersiz metni ve yabancı JSON'u reddeder, bozuk satırları atlar", () => {
    expect(parseBackup('merhaba')).toEqual({ ok: false, error: 'Metin geçerli bir yedek değil.' });
    expect(parseBackup('{"a":1}')).toEqual({ ok: false, error: 'Bu bir Chronos yedeği değil.' });
    const r = parseBackup(
      JSON.stringify({
        app: 'chronos',
        version: 1,
        entries: [{ id: 'ok', date: '2026-10-04', text: 'a' }, { id: 'kotu', date: 'dün', text: 'b' }, null],
      }),
    );
    expect(r.ok && r.entries.map((e) => e.id)).toEqual(['ok']);
    expect(parseBackup(JSON.stringify({ app: 'chronos', entries: [] })).ok).toBe(false);
  });
});

describe('searchNotes', () => {
  const list = [
    entry({ id: '1', text_content: 'İlaç al', date: '2026-10-04', color: 'red' }),
    entry({ id: '2', text_content: 'Toplantı', date: '2026-10-06', color: 'blue' }),
    entry({ id: '3', text_content: 'ilaç kutusu\nTemizlik', date: '2026-10-01' }),
  ];
  it('Türkçe harf ve büyük/küçük harf farkını yok sayar', () => {
    expect(fold('İLAÇ')).toBe('ilac');
    expect(fold('Işık')).toBe('isik');
    expect(searchNotes(list, 'ILAC', null).map((e) => e.id)).toEqual(['1', '3']);
    expect(searchNotes(list, 'temizlik', null).map((e) => e.id)).toEqual(['3']);
  });
  it('renge göre süzer, boş arama boş döner, yeniden eskiye sıralar', () => {
    expect(searchNotes(list, '', 'blue').map((e) => e.id)).toEqual(['2']);
    expect(searchNotes(list, '', null)).toEqual([]);
    expect(searchNotes(list, 'i', null).map((e) => e.date)).toEqual(['2026-10-06', '2026-10-04', '2026-10-01']);
  });
});
