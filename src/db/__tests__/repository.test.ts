/**
 * @jest-environment node
 */
// Gerçek SQL'i Node'un yerleşik SQLite modülüyle (node:sqlite) çalıştırır.
import type { SqlDriver } from '../driver';
import { migrate } from '../migrate';
import { createRepository } from '../repository';
import { materializeSeries } from '../../services/series';
import { CREATE_TABLES } from '../schema';

function createNodeDriver(): SqlDriver {
  // jest çözümleyicisini atlamak için getBuiltinModule kullanılır
  const { DatabaseSync } = (process as any).getBuiltinModule('node:sqlite');
  const db = new DatabaseSync(':memory:');
  return {
    async execute(sql, params = []) {
      const stmt = db.prepare(sql);
      if (/^\s*(SELECT|PRAGMA user_version\s*$)/i.test(sql)) {
        return stmt.all(...params);
      }
      stmt.run(...params);
      return [];
    },
  };
}

async function setup() {
  const driver = createNodeDriver();
  await migrate(driver);
  const repo = createRepository(driver);
  const nb = await repo.ensureDefaultNotebook();
  return { driver, repo, nb };
}

describe('repository', () => {
  it('migration idempotent ve varsayılan defter tektir', async () => {
    const { driver, repo, nb } = await setup();
    await migrate(driver);
    expect((await repo.ensureDefaultNotebook()).id).toBe(nb.id);
  });

  it('gün sayfası bir kez oluşturulur', async () => {
    const { repo, nb } = await setup();
    const a = await repo.getOrCreatePage(nb.id, '2026-10-05');
    const b = await repo.getOrCreatePage(nb.id, '2026-10-05');
    expect(a.id).toBe(b.id);
  });

  it('tarihli giriş güne, tarihsiz giriş Havuza düşer; sürükle-bırak günü değiştirir', async () => {
    const { repo, nb } = await setup();
    await repo.createEntry(nb.id, { text: 'Bütçe toplantısı', date: '2026-10-05', time: '15:00' });
    await repo.createEntry(nb.id, { text: 'Erken kalk', date: '2026-10-05', time: '07:00' });
    const inbox = await repo.createEntry(nb.id, { text: 'Kitap oku' });

    const day = await repo.listEntriesForDate(nb.id, '2026-10-05');
    expect(day.map((e) => e.time_slot)).toEqual(['07:00', '15:00']);
    expect((await repo.listInbox()).map((e) => e.text_content)).toEqual(['Kitap oku']);

    await repo.moveEntryToDate(nb.id, inbox.id, '2026-10-07');
    expect(await repo.listInbox()).toHaveLength(0);
    const moved = await repo.listEntriesForDate(nb.id, '2026-10-07');
    expect(moved[0]).toMatchObject({ text_content: 'Kitap oku', is_inbox: false, date: '2026-10-07' });

    expect(await repo.countEntriesByDate(nb.id, '2026-10-01', '2026-10-31')).toEqual({
      '2026-10-05': 2,
      '2026-10-07': 1,
    });

    await repo.toggleEntry(moved[0].id);
    expect((await repo.listEntriesForDate(nb.id, '2026-10-07'))[0].is_completed).toBe(true);
  });

  it('vuruşları JSON olarak saklar ve geri okur', async () => {
    const { repo, nb } = await setup();
    const page = await repo.getOrCreatePage(nb.id, '2026-10-04');
    const s = await repo.addStroke(page.id, {
      points: [
        [10.123, 20.456, 0.5],
        [11, 21, 0.73],
      ],
      color: '#1B2A4A',
      width: 4,
    });
    const list = await repo.listStrokes(page.id);
    expect(list).toEqual([
      {
        id: s.id,
        points: [
          [10.1, 20.5, 0.5],
          [11, 21, 0.73],
        ],
        color: '#1B2A4A',
        width: 4,
      },
    ]);
    await repo.deleteStroke(s.id);
    expect(await repo.listStrokes(page.id)).toHaveLength(0);
  });

  it('notu günceller ve siler', async () => {
    const { repo, nb } = await setup();
    const e = await repo.createEntry(nb.id, { text: 'Süt al', date: '2026-10-04' });
    await repo.updateEntry(e.id, '  Süt ve ekmek al ', '08:30');
    const [u] = await repo.listEntriesForDate(nb.id, '2026-10-04');
    expect(u.text_content).toBe('Süt ve ekmek al');
    expect(u.time_slot).toBe('08:30');
    await repo.deleteEntry(e.id);
    expect(await repo.listEntriesForDate(nb.id, '2026-10-04')).toHaveLength(0);
  });

  it('renk etiketini saklar; v1 veri tabanı v2ye yükseltilir', async () => {
    const { repo, nb } = await setup();
    const e = await repo.createEntry(nb.id, { text: 'Spor', date: '2026-10-05', color: 'green' });
    expect((await repo.listEntriesForDate(nb.id, '2026-10-05'))[0].color).toBe('green');
    await repo.setEntryColor(e.id, null);
    expect((await repo.listEntriesForDate(nb.id, '2026-10-05'))[0].color).toBeNull();

    // Eski (v1) şemalı veri tabanı: color sütunu yok
    const driver = createNodeDriver();
    for (const sql of CREATE_TABLES.filter((q) => !q.includes('idx_entries_series')))
      await driver.execute(
        sql.replace(
          ',\n    color TEXT,\n    reminder_minutes INTEGER,\n    notification_id TEXT,\n    repeat TEXT,\n    series_id TEXT,\n    end_time TEXT',
          '',
        ),
      );
    await driver.execute('PRAGMA user_version = 1');
    await migrate(driver);
    const cols = await driver.execute("SELECT name FROM pragma_table_info('entries')");
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(['color', 'reminder_minutes', 'notification_id', 'repeat', 'series_id', 'end_time']),
    );
  });

  it('bitiş saatini saklar; saat yoksa bitiş de yoktur', async () => {
    const { repo, nb } = await setup();
    const e = await repo.createEntry(nb.id, { text: 'Toplantı', date: '2026-10-05', time: '09:00', endTime: '10:30' });
    expect((await repo.getEntry(e.id))?.end_time).toBe('10:30');
    await repo.setEntryEndTime(e.id, null);
    expect((await repo.getEntry(e.id))?.end_time).toBeNull();
    const n = await repo.createEntry(nb.id, { text: 'Saatsiz', date: '2026-10-05', endTime: '11:00' });
    expect(n.end_time).toBeNull();
  });

  it('alarm dakikasını ve bildirim kimliğini saklar', async () => {
    const { repo, nb } = await setup();
    const e = await repo.createEntry(nb.id, {
      text: 'Diş hekimi',
      date: '2026-10-06',
      time: '14:30',
      reminderMinutes: 15,
    });
    expect((await repo.getEntry(e.id))?.reminder_minutes).toBe(15);
    await repo.setNotificationId(e.id, 'abc');
    expect((await repo.listEntriesWithReminder()).map((x) => x.notification_id)).toEqual(['abc']);
    await repo.toggleEntry(e.id);
    expect(await repo.listEntriesWithReminder()).toHaveLength(0);
    await repo.setEntryReminder(e.id, null);
    expect((await repo.getEntry(e.id))?.reminder_minutes).toBeNull();
  });

  it('hafta aralığındaki notları gün ve saate göre sıralı getirir', async () => {
    const { repo, nb } = await setup();
    await repo.createEntry(nb.id, { text: 'Çarşamba', date: '2026-10-07' });
    await repo.createEntry(nb.id, { text: 'Pazartesi öğleden sonra', date: '2026-10-05', time: '15:00' });
    await repo.createEntry(nb.id, { text: 'Pazartesi sabah', date: '2026-10-05', time: '09:00' });
    await repo.createEntry(nb.id, { text: 'Gelecek hafta', date: '2026-10-12' });
    const list = await repo.listEntriesBetween(nb.id, '2026-10-05', '2026-10-11');
    expect(list.map((e) => e.text_content)).toEqual(['Pazartesi sabah', 'Pazartesi öğleden sonra', 'Çarşamba']);
  });

  it('tekrarlayan not: zincir üretilir, tekrar tekrar çağrılınca çoğalmaz, durdurulunca gelecek silinir', async () => {
    const { repo, nb } = await setup();
    const first = await repo.createEntry(nb.id, { text: 'İlaç', date: '2026-10-04', time: '08:00', repeat: 'daily' });
    expect(first.series_id).toBe(first.id);
    const created = await materializeSeries(repo, nb.id, '2026-10-08');
    expect(created).toHaveLength(4);
    expect(await materializeSeries(repo, nb.id, '2026-10-08')).toHaveLength(0);
    const week = await repo.listEntriesBetween(nb.id, '2026-10-04', '2026-10-10');
    expect(week.map((e) => e.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
    expect(week[3]).toMatchObject({ text_content: 'İlaç', time_slot: '08:00', repeat: 'daily', series_id: first.id });

    // 5 Ekim tamamlanır; 6 Ekim'den durdurulursa 7-8 silinir, tamamlanan ve önceki kalır
    await repo.toggleEntry(week[1].id);
    const stopFrom = week[2];
    await repo.changeSeries(stopFrom.id, null);
    const after = await repo.listEntriesBetween(nb.id, '2026-10-04', '2026-10-10');
    expect(after.map((e) => e.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06']);
    expect(after.every((e) => e.repeat === null)).toBe(true);
    expect(await materializeSeries(repo, nb.id, '2026-10-20')).toHaveLength(0);
  });

  it('tekrar kuralı değişince sonraki tekrarlar yeni kurala göre yeniden üretilir', async () => {
    const { repo, nb } = await setup();
    const e = await repo.createEntry(nb.id, { text: 'Spor', date: '2026-10-05', repeat: 'daily' });
    await materializeSeries(repo, nb.id, '2026-10-09');
    await repo.changeSeries(e.id, 'weekly');
    await materializeSeries(repo, nb.id, '2026-10-20');
    const all = await repo.listEntriesBetween(nb.id, '2026-10-01', '2026-10-31');
    expect(all.map((x) => x.date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it("v3 veri tabanı v4'e yükseltilir", async () => {
    const driver = createNodeDriver();
    for (const sql of CREATE_TABLES.filter((q) => !q.includes('idx_entries_series'))) {
      await driver.execute(sql.replace(/,\s*repeat TEXT,\s*series_id TEXT,\s*end_time TEXT/, ''));
    }
    await driver.execute('PRAGMA user_version = 3');
    await migrate(driver);
    const repo = createRepository(driver);
    const nb = await repo.ensureDefaultNotebook();
    const e = await repo.createEntry(nb.id, { text: 'x', date: '2026-10-04', repeat: 'weekly' });
    expect((await repo.getEntry(e.id))?.repeat).toBe('weekly');
  });

  it('ayar saklar ve günceller; yedek içe aktarma aynı kimliği iki kez eklemez', async () => {
    const { repo, nb } = await setup();
    expect(await repo.getSetting('accent')).toBeNull();
    await repo.setSetting('accent', 'deniz');
    await repo.setSetting('accent', 'mor');
    expect(await repo.getSetting('accent')).toBe('mor');

    const item = {
      id: 'yedek1',
      date: '2026-10-09',
      time: '10:00',
      text: 'Geri geldi',
      done: true,
      color: 'green',
      reminder: 5,
      repeat: null,
      series: null,
      created: 5,
    };
    expect(await repo.importEntries(nb.id, [item])).toEqual(['yedek1']);
    expect(await repo.importEntries(nb.id, [item])).toEqual([]);
    const all = await repo.listAllEntries(nb.id);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: 'yedek1',
      date: '2026-10-09',
      is_completed: true,
      color: 'green',
      reminder_minutes: 5,
    });
  });
});
