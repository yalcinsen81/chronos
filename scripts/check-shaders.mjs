// SkSL shader'larını CanvasKit (Skia'nın WASM derlemesi) ile Node'da derler.
// Cihaz olmadan shader sözdizimi hatalarını yakalamak için: npm run check:shaders
import CanvasKitInit from 'canvaskit-wasm/bin/full/canvaskit.js';
import fs from 'node:fs';

const file = new URL('../src/components/canvas/shaders.ts', import.meta.url);
const src = fs.readFileSync(file, 'utf8');
const CK = await CanvasKitInit();
let failed = 0;
for (const [, name, code] of src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)) {
  const effect = CK.RuntimeEffect.Make(code, (err) => {
    console.error(`✗ ${name}: ${err}`);
    failed++;
  });
  if (effect) console.log(`✓ ${name} (${effect.getUniformCount()} uniform)`);
}
process.exit(failed ? 1 : 0);
