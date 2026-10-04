// Web girişi (tarayıcı önizlemesi): SQLite (sql.js) WASM modülü yüklenmeden
// uygulama modülleri içe aktarılmaz; veri sürücüsü açılışta hazır olmalıdır.
import { registerRootComponent } from 'expo';

import { bootstrapWeb } from './src/platform/bootstrap.web';

bootstrapWeb().then(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require('./App').default;
  registerRootComponent(App);
});
