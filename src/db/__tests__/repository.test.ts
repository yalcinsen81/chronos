/**
 * @jest-environment node
 */
// Gerçek SQL'i Node'un yerleşik SQLite modülüyle (node:sqlite) çalıştırır.
import type { SqlDriver } from '../driver';
import { migrate } from '../migrate';
import { createRepository } from '../repository';

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
      points: [[10.123, 20.456, 0.5], [11, 21, 0.73]],
      color: '#1B2A4A',
      width: 4,
    });
    const list = await repo.listStrokes(page.id);
    expect(list).toEqual([{ id: s.id, points: [[10.1, 20.5, 0.5], [11, 21, 0.73]], color: '#1B2A4A', width: 4 }]);
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
});
