import { createServer } from 'node:http';
import { env } from './shared/env.js';
import { buildApp } from './app.js';

const app = buildApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${env.PORT}`);
});
