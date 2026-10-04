// op-sqlite sürücüsü: JSI üzerinden milisaniyelik yerel sorgular.

import { open } from '@op-engineering/op-sqlite';

import type { SqlDriver } from './driver';

export function createOpSqliteDriver(name = 'chronos-paper.db'): SqlDriver {
  const db = open({ name });
  return {
    async execute(sql, params = []) {
      const res = await db.execute(sql, params);
      return res.rows as Record<string, unknown>[];
    },
  };
}
