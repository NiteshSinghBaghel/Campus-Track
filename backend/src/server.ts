import { app } from './app.js';
import { config } from './config/index.js';

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Campus Track Backend] Running on http://127.0.0.1:${PORT}`);
  console.log(`[Campus Track Backend] Connected to DYPIU Juno ERP: ${config.dypiuBaseUrl}`);
});

