import 'dotenv/config';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

test('HTTP e PostgreSQL: autenticação, CRUDs, isolamento, centavos, transações e limite de tentativas', {
  skip: !process.env.TEST_DATABASE_URL && 'Defina TEST_DATABASE_URL para executar a integração com PostgreSQL.',
}, async () => {
  process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
  const { authScenarios } = await import('./_auth-scenarios.js');
  const { pool: defaultPool } = await import('../src/config/database.js');
  // Identificador gerado internamente, nunca recebido de uma requisição.
  const schema = `test_${randomUUID().replaceAll('-','')}`;
  const admin = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
  let db;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});
    await db.query(await readFile(new URL('../database/001-inicial.sql',import.meta.url),'utf8'));
    await authScenarios(db);
    const { financeScenarios } = await import('./_finance-scenarios.js');
    await financeScenarios(db);
    const { reportsScenarios } = await import('./_reports-scenarios.js');
    await reportsScenarios(db);
    const { healthScenarios } = await import('./_health-scenarios.js');
    await healthScenarios(db);
  } finally {
    if(db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end(); await defaultPool.end();
  }
});
