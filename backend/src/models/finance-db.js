import { AppError } from '../config/errors.js';

export function dbError(error) {
  if (error.code === '23505') return new AppError(409,'Já existe um registro com esse nome.',{nome:'Escolha outro nome.'});
  if (['23503','23001'].includes(error.code)) return new AppError(409,'O registro possui lançamentos vinculados ou um vínculo foi alterado. Revise os dados.');
  return error;
}
export async function transaction(db, task) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const result=await task(client);
    await client.query('COMMIT');
    return result;
  } catch(error) {
    await client.query('ROLLBACK');
    throw dbError(error);
  } finally { client.release(); }
}
export function found(rows) {
  if (!rows.length) throw new AppError(404,'Registro não encontrado.');
  return rows[0];
}
