import 'dotenv/config';
import { pool } from './config/database.js';
import { createApp } from './config/app.js';

let server;
try {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  const app = createApp({ db: pool, jwtSecret: process.env.JWT_SECRET, frontendOrigin: process.env.FRONTEND_ORIGIN });
  await pool.query('SELECT id FROM usuarios LIMIT 1');
  server = app.listen(port, () => console.log(`API disponível em http://localhost:${port}/health`));
  server.on('error', (error) => { console.error('Falha ao iniciar API:', error.code ?? error.name); process.exitCode = 1; void pool.end(); });
} catch (error) {
  console.error('Não foi possível iniciar a API:', error.message);
  process.exitCode = 1;
  await pool.end();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    if (!server) return;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => { pool.end().finally(() => { clearTimeout(timeout); process.exit(); }); });
  });
}
