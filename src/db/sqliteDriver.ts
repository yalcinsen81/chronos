// expo-sqlite sürücüsü: Expo Go'da da çalışır, development build gerektirmez.

import { openDatabaseSync } from 'expo-sqlite';

import type { Row, SqlDriver } from './driver';

export function createSqliteDriver(name = 'chronos-paper.db'): SqlDriver {
  const db = openDatabaseSync(name);
  return {
    async execute(sql, params = []) {
      return db.getAllAsync<Row>(sql, params);
    },
  };
}
