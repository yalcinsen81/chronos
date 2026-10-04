// Web girişi (tarayıcı önizlemesi): Skia (CanvasKit) ve SQLite (sql.js) WASM modülleri yüklenmeden
// uygulama modülleri içe aktarılmaz; çünkü shader'lar modül yüklenirken derlenir.
import { registerRootComponent } from 'expo';

import { bootstrapWeb } from './src/platform/bootstrap.web';

bootstrapWeb().then(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require('./App').default;
  registerRootComponent(App);
});
