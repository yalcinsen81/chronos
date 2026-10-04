// Şema kurulumu ve sürüm takibi (PRAGMA user_version).

import type { SqlDriver } from './driver';
import { CREATE_TABLES, SCHEMA_VERSION } from './schema';

export async function migrate(db: SqlDriver): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  const [row] = await db.execute('PRAGMA user_version');
  const current = Number(row?.user_version ?? 0);
  if (current >= SCHEMA_VERSION) return;
  for (const sql of CREATE_TABLES) await db.execute(sql);
  // Sonraki sürümlerde buraya "if (current < 2) ALTER TABLE ..." adımları eklenir
  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
