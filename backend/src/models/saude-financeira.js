import {pool} from '../config/database.js';
import {calculateFinancialHealth} from '../config/financial-health.js';

export function criarSaudeModel(db=pool){
  return {async analisar(user,month){
    const {rows}=await db.query(`SELECT l.tipo,l.valor,to_char(l.data,'YYYY-MM-DD') AS data,
      l.parcela_atual,l.total_parcelas,f.tipo AS fonte_tipo,f.dia_fechamento,f.dia_vencimento
      FROM lancamentos l JOIN fontes_destinos f ON f.id=l.fonte_destino_id AND f.usuario_id=l.usuario_id
      WHERE l.usuario_id=$1`,[user]);
    return calculateFinancialHealth(rows,month);
  }};
}
