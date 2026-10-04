// Şema kurulumu ve sürüm takibi (PRAGMA user_version).

import type { SqlDriver } from './driver';
import { CREATE_TABLES, SCHEMA_VERSION, UPGRADES } from './schema';

export async function migrate(db: SqlDriver): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  const [row] = await db.execute('PRAGMA user_version');
  const current = Number(row?.user_version ?? 0);
  if (current >= SCHEMA_VERSION) return;
  if (current === 0) {
    // Yeni kurulum: tablolar en güncel haliyle oluşturulur
    for (const sql of CREATE_TABLES) await db.execute(sql);
  } else {
    for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
      for (const sql of UPGRADES[v] ?? []) await db.execute(sql);
    }
  }
  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
