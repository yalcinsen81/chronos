// Web önizleme sürücüsü: expo-sqlite yerine tarayıcıda sql.js (WASM SQLite) kullanılır.
// Aynı SQL şeması ve repository çalışır; veri localStorage'a kaydedilir (erişilemezse yalnızca bellekte kalır).

import { getSqlJs } from '../platform/bootstrap.web';
import type { Row, SqlDriver } from './driver';

interface SqlJsDb {
  exec(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] }[];
  run(sql: string, params?: unknown[]): void;
  export(): Uint8Array;
}

const STORAGE_KEY = 'chronos-paper-db';

function loadSaved(): Uint8Array | undefined {
  try {
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (!b64) return undefined;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return undefined;
  }
}

export function createSqliteDriver(_name = 'chronos-paper.db'): SqlDriver {
  const SQL = getSqlJs();
  const db = new SQL.Database(loadSaved()) as SqlJsDb;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const bytes = db.export();
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        localStorage.setItem(STORAGE_KEY, btoa(bin));
      } catch {
        // Gizli pencere / kota: önizleme bellekte çalışmaya devam eder
      }
    }, 400);
  };

  return {
    async execute(sql, params = []) {
      const results = db.exec(sql, params);
      if (!/^\s*(SELECT|PRAGMA user_version\s*$)/i.test(sql)) persist();
      const first = results[0];
      if (!first) return [];
      return first.values.map((vals) => {
        const row: Row = {};
        first.columns.forEach((c, i) => (row[c] = vals[i]));
        return row;
      });
    },
  };
}
