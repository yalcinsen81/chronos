// Tarayıcı önizlemesi üretir: expo export (web) + mutlak yolları göreli yapar.
// Böylece çıktı herhangi bir alt dizinde (statik barındırma, artifact) açılabilir.
// Kullanım: node scripts/build-web-preview.mjs [çıktı-klasörü]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] ?? 'dist-web');
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, { stdio: 'inherit', env: { ...process.env, CI: '1' } });

const html = path.join(out, 'index.html');
fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace(/(src|href)="\/(?!\/)/g, '$1="./'));

const jsDir = path.join(out, '_expo/static/js/web');
for (const f of fs.readdirSync(jsDir)) {
  const p = path.join(jsDir, f);
  // Font ve görsel varlık yolları: "/assets/..." → "./assets/..." (sayfaya göreli)
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/"\/assets\//g, '"./assets/'));
}
console.log(`Önizleme hazır: ${out}`);
