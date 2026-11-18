import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';
import { invalid, installments, money } from '../config/finance-validation.js';
import { found, transaction } from './finance-db.js';

const select = `SELECT l.id,l.usuario_id,l.tipo,l.descricao,l.valor,to_char(l.data,'YYYY-MM-DD') AS data,
 l.categoria_id,c.nome AS categoria_nome,l.fonte_destino_id,f.nome AS fonte_destino_nome,
 l.parcela_atual,l.total_parcelas,l.grupo_parcelamento,l.criado_em
 FROM lancamentos l JOIN categorias c ON c.id=l.categoria_id AND c.usuario_id=l.usuario_id
 JOIN fontes_destinos f ON f.id=l.fonte_destino_id AND f.usuario_id=l.usuario_id`;

async function validateLinks(client,user,data,count) {
  const category=(await client.query('SELECT id,tipo FROM categorias WHERE usuario_id=$1 AND id=$2 FOR SHARE',[user,data.categoria_id])).rows[0];
  const source=(await client.query('SELECT id,tipo FROM fontes_destinos WHERE usuario_id=$1 AND id=$2 FOR SHARE',[user,data.fonte_destino_id])).rows[0];
  if(!category) invalid('categoria_id','Categoria não encontrada para este usuário.');
  if(!source) invalid('fonte_destino_id','Fonte/destino não encontrada para este usuário.');
  if(category.tipo!==data.tipo) invalid('categoria_id','O tipo da categoria deve corresponder ao lançamento.');
  if(source.tipo==='cartao_credito' && data.tipo!=='saida') invalid('fonte_destino_id','Cartão de crédito só pode ser destino de saídas.');
  if(source.tipo==='renda' && data.tipo!=='entrada') invalid('fonte_destino_id','Fonte de renda só pode ser usada em entradas.');
  if(count>1 && source.tipo!=='cartao_credito') invalid('total_parcelas','O parcelamento está disponível apenas para cartão de crédito.');
}

export function criarLancamentoModel(db=pool) {
  return {
    async obter(user,id) {
      return found((await db.query(`${select} WHERE l.usuario_id=$1 AND l.id=$2`,[user,id])).rows);
    },
    async listar(user,filters) {
      const values=[user,filters.inicio,filters.fim];
      const clauses=['l.usuario_id=$1','l.data BETWEEN $2 AND $3'];
      for(const field of ['tipo','categoria_id','fonte_destino_id']) if(filters[field]!==undefined) {
        values.push(filters[field]);clauses.push(`l.${field}=$${values.length}`);
      }
      const where=clauses.join(' AND ');
      // Totais cobrem o filtro inteiro, não apenas a página mostrada.
      const summary=(await db.query(`SELECT count(*)::int AS quantidade,
        coalesce(sum(valor) FILTER (WHERE tipo='entrada'),0)::text AS entradas,
        coalesce(sum(valor) FILTER (WHERE tipo='saida'),0)::text AS saidas,
        coalesce(sum(CASE WHEN tipo='entrada' THEN valor ELSE -valor END),0)::text AS saldo
        FROM lancamentos l WHERE ${where}`,values)).rows[0];
      const pageValues=[...values,filters.limite,(filters.pagina-1)*filters.limite];
      const {rows}=await db.query(`${select} WHERE ${where} ORDER BY l.data DESC,l.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,pageValues);
      return {dados:rows,periodo:{inicio:filters.inicio,fim:filters.fim},totais:{entradas:summary.entradas,saidas:summary.saidas,saldo:summary.saldo},paginacao:{pagina:filters.pagina,limite:filters.limite,total:summary.quantidade,paginas:Math.ceil(summary.quantidade/filters.limite)}};
    },
    async criar(user,data) {
      return transaction(db,async client=>{
        await validateLinks(client,user,data,data.total_parcelas);
        const group=data.total_parcelas>1 ? randomUUID() : null;
        const values=installments(data.valorCentavos,data.total_parcelas);
        const result=[];
        for(let i=0;i<values.length;i++) {
          const {rows}=await client.query(`INSERT INTO lancamentos
            (usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id,parcela_atual,total_parcelas,grupo_parcelamento)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [user,data.tipo,data.descricao,money(values[i]),data.data,data.categoria_id,data.fonte_destino_id,i+1,data.total_parcelas,group]);
          result.push(rows[0].id);
        }
        return (await client.query(`${select} WHERE l.usuario_id=$1 AND l.id=ANY($2::int[]) ORDER BY l.parcela_atual`,[user,result])).rows;
      });
    },
    async editar(user,id,data) {
      return transaction(db,async client=>{
        const current=found((await client.query('SELECT * FROM lancamentos WHERE usuario_id=$1 AND id=$2 FOR UPDATE',[user,id])).rows);
        await validateLinks(client,user,data,current.total_parcelas);
        await client.query(`UPDATE lancamentos SET tipo=$3,descricao=$4,valor=$5,data=$6,categoria_id=$7,fonte_destino_id=$8
          WHERE usuario_id=$1 AND id=$2`,[user,id,data.tipo,data.descricao,money(data.valorCentavos),data.data,data.categoria_id,data.fonte_destino_id]);
        return (await client.query(`${select} WHERE l.usuario_id=$1 AND l.id=$2`,[user,id])).rows[0];
      });
    },
    async excluir(user,id,scope) {
      return transaction(db,async client=>{
        const current=found((await client.query('SELECT id,grupo_parcelamento FROM lancamentos WHERE usuario_id=$1 AND id=$2 FOR UPDATE',[user,id])).rows);
        if(scope==='compra' && current.grupo_parcelamento) {
          await client.query('DELETE FROM lancamentos WHERE usuario_id=$1 AND grupo_parcelamento=$2',[user,current.grupo_parcelamento]);
        } else {
          await client.query('DELETE FROM lancamentos WHERE usuario_id=$1 AND id=$2',[user,id]);
        }
      });
    },
  };
}
