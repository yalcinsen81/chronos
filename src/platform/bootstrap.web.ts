// Tarayıcı önizlemesi için SQLite'ı (sql.js WASM) yükler.
// Dosyalar public/ klasöründen sayfaya göreli yoldan servis edilir (alt dizinde barındırmaya uygun).

type SqlJsStatic = { Database: new (data?: Uint8Array) => unknown };

let sqlJs: SqlJsStatic | null = null;

export function getSqlJs(): SqlJsStatic {
  if (!sqlJs) throw new Error('sql.js henüz yüklenmedi');
  return sqlJs;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`${src} yüklenemedi`));
    document.head.appendChild(s);
  });
}

export async function bootstrapWeb(): Promise<void> {
  await loadScript('./sql-wasm-browser.js');
  const init = (globalThis as unknown as { initSqlJs: (o: object) => Promise<SqlJsStatic> }).initSqlJs;
  sqlJs = await init({ locateFile: (file: string) => `./${file.replace('sql-wasm.wasm', 'sql-wasm-browser.wasm')}` });
}
