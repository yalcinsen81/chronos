// Veri tabanı sürücü soyutlaması. Uygulamada op-sqlite, testlerde Node'un yerleşik sqlite modülü kullanılır.

export type SqlValue = string | number | null;
export type Row = Record<string, unknown>;

export interface SqlDriver {
  execute(sql: string, params?: SqlValue[]): Promise<Row[]>;
}
