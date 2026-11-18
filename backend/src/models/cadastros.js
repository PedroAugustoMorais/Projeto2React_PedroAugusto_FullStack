import { pool } from '../config/database.js';
import { AppError } from '../config/errors.js';
import { dbError, found, transaction } from './finance-db.js';

export function criarCadastroModel(kind, db = pool) {
  // Somente metadados internos controlados; nunca aceita tabela ou coluna da requisição.
  const definition = {
    categorias:{table:'categorias',columns:['nome','tipo']},
    fontes:{table:'fontes_destinos',columns:['nome','tipo','dia_fechamento','dia_vencimento','limite']},
  }[kind];
  if(!definition) throw new Error('Cadastro inválido.');
  const {table,columns}=definition;
  return {
    async listar(user) {
      const {rows}=await db.query(`SELECT * FROM ${table} WHERE usuario_id=$1 ORDER BY lower(nome),id`,[user]);
      return rows;
    },
    async obter(user,id) {
      const {rows}=await db.query(`SELECT * FROM ${table} WHERE usuario_id=$1 AND id=$2`,[user,id]);
      return found(rows);
    },
    async criar(user,data) {
      try {
        const values=[user,...columns.map(c=>data[c])];
        const {rows}=await db.query(`INSERT INTO ${table} (usuario_id,${columns.join(',')}) VALUES (${values.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values);
        return rows[0];
      } catch(error){throw dbError(error);}
    },
    async editar(user,id,data) {
      return transaction(db,async client=>{
        const current=found((await client.query(`SELECT * FROM ${table} WHERE usuario_id=$1 AND id=$2 FOR UPDATE`,[user,id])).rows);
        if(kind==='fontes' && current.tipo!==data.tipo) {
          const linked=await client.query('SELECT id FROM lancamentos WHERE usuario_id=$1 AND fonte_destino_id=$2 LIMIT 1',[user,id]);
          if(linked.rows.length) throw new AppError(409,'Não é possível alterar o tipo de uma fonte/destino com lançamentos vinculados.');
        }
        const values=[user,id,...columns.map(c=>data[c])];
        return (await client.query(`UPDATE ${table} SET ${columns.map((c,i)=>c+'=$'+(i+3)).join(',')} WHERE usuario_id=$1 AND id=$2 RETURNING *`,values)).rows[0];
      });
    },
    async excluir(user,id) {
      try {
        const {rows}=await db.query(`DELETE FROM ${table} WHERE usuario_id=$1 AND id=$2 RETURNING id`,[user,id]);
        found(rows);
      } catch(error){throw dbError(error);}
    },
  };
}
