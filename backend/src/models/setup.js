import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pool } from '../config/database.js';

export async function migrate() {
  const sql = await readFile(new URL('../../database/001-inicial.sql', import.meta.url), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(2565935)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome TEXT PRIMARY KEY, checksum TEXT NOT NULL, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT checksum FROM schema_migrations WHERE nome = $1', ['001-inicial']);
    if (rows.length && rows[0].checksum !== checksum) {
      throw new Error('A migration aplicada foi alterada. Crie outra migration em vez de editar a existente.');
    }
    if (!rows.length) {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nome, checksum) VALUES ($1, $2)', ['001-inicial', checksum]);
    }
    await client.query('COMMIT');
    console.log(rows.length ? 'Banco já está atualizado.' : 'Estrutura inicial criada.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabase() {
  const { rows } = await pool.query(`SELECT
    (SELECT count(*)::int FROM usuarios) AS usuarios,
    (SELECT count(*)::int FROM categorias) AS categorias,
    (SELECT count(*)::int FROM fontes_destinos) AS fontes_destinos,
    (SELECT count(*)::int FROM lancamentos) AS lancamentos,
    (SELECT count(DISTINCT to_char(data, 'YYYY-MM'))::int FROM lancamentos) AS meses`);
  console.table(rows);
}
