import { pool } from '../config/database.js';
import {AppError} from '../config/errors.js';
import {bigCents,decimal} from '../config/decimal.js';
import {calcularFatura,nextInvoices} from '../config/finance-dates.js';

export function criarFaturaModel(db=pool){
  return {
    async listar(user,{referenceDate,cardId}){
      const args=[user];
      if(cardId!==undefined)args.push(cardId);
      const cards=(await db.query(`SELECT id,nome,dia_fechamento,dia_vencimento,limite FROM fontes_destinos
        WHERE usuario_id=$1 AND tipo='cartao_credito' ${cardId!==undefined?'AND id=$2':''} ORDER BY lower(nome),id`,args)).rows;
      if(cardId!==undefined&&!cards.length)throw new AppError(404,'Cartão não encontrado.');
      if(!cards.length)return {data_referencia:referenceDate,cartoes:[]};
      const entries=(await db.query(`SELECT l.id,l.fonte_destino_id,l.descricao,l.valor,to_char(l.data,'YYYY-MM-DD') AS data_compra,
        l.parcela_atual,l.total_parcelas,l.grupo_parcelamento,c.nome AS categoria_nome
        FROM lancamentos l JOIN categorias c ON c.id=l.categoria_id AND c.usuario_id=l.usuario_id
        WHERE l.usuario_id=$1 AND l.tipo='saida' AND l.fonte_destino_id=ANY($2::int[])
        ORDER BY l.data,l.parcela_atual,l.id`,[user,cards.map(c=>c.id)])).rows;
      const cartoes=cards.map(card=>{
        const invoices=new Map();let committed=0n;
        for(const entry of entries){
          if(entry.fonte_destino_id!==card.id)continue;
          const invoice=calcularFatura(entry.data_compra,card,entry.parcela_atual);
          const key=invoice.referencia;
          if(!invoices.has(key))invoices.set(key,{...invoice,total:0n,lancamentos:[]});
          const target=invoices.get(key);
          target.total+=bigCents(entry.valor);
          target.lancamentos.push({...entry,parcela:`${entry.parcela_atual}/${entry.total_parcelas}`});
          if(invoice.vencimento>=referenceDate)committed+=bigCents(entry.valor);
        }
        const limit=bigCents(card.limite);
        const projection=nextInvoices(referenceDate,card).map((invoice,index)=>{
          const found=invoices.get(invoice.referencia);
          return {...invoice,situacao:index===0?'aberta':'prevista',total:decimal(found?.total??0n),
            lancamentos:found?.lancamentos??[],limite_utilizado:decimal(committed),limite_disponivel:decimal(limit-committed)};
        });
        const closedPending=[...invoices.values()].filter(i=>i.fechamento<projection[0].fechamento&&i.vencimento>=referenceDate)
          .map(i=>({...i,total:decimal(i.total),situacao:'fechada_a_vencer'})).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
        return {...card,limite:decimal(limit),limite_utilizado:decimal(committed),limite_disponivel:decimal(limit-committed),
          acima_do_limite:committed>limit,faturas:projection,faturas_fechadas_a_vencer:closedPending};
      });
      return {data_referencia:referenceDate,cartoes};
    },
  };
}
