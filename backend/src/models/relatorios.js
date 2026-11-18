import { pool } from '../config/database.js';
import { previousPeriod } from '../config/finance-dates.js';
import {bigCents,decimal,percentage,change} from '../config/decimal.js';

export function criarRelatorioModel(db=pool){
  return {
    async categorias(user,period){
      const previous=previousPeriod(period.inicio,period.fim);
      const {rows}=await db.query(`SELECT c.id,c.nome,c.tipo,
        coalesce(sum(l.valor) FILTER(WHERE l.data BETWEEN $2 AND $3),0)::text AS atual,
        coalesce(sum(l.valor) FILTER(WHERE l.data BETWEEN $4 AND $5),0)::text AS anterior
        FROM categorias c LEFT JOIN lancamentos l ON l.categoria_id=c.id AND l.usuario_id=c.usuario_id
        AND l.data BETWEEN $4 AND $3 WHERE c.usuario_id=$1
        GROUP BY c.id,c.nome,c.tipo ORDER BY sum(l.valor) FILTER(WHERE l.data BETWEEN $2 AND $3) DESC NULLS LAST,c.id`,
      [user,period.inicio,period.fim,previous.inicio,previous.fim]);
      const totals={entrada:0n,saida:0n};
      for(const row of rows)totals[row.tipo]+=bigCents(row.atual);
      const groups={entrada:[],saida:[]};
      for(const row of rows){
        const current=bigCents(row.atual),before=bigCents(row.anterior);
        if(current===0n&&before===0n)continue;
        groups[row.tipo].push({id:row.id,nome:row.nome,total:decimal(current),percentual:percentage(current,totals[row.tipo]),
          periodo_anterior:decimal(before),diferenca:decimal(current-before),variacao_percentual:change(current,before),
          tendencia:current===before?'estavel':before===0n?'novo':current>before?'aumento':'reducao'});
      }
      return {periodo:{inicio:period.inicio,fim:period.fim},periodo_anterior:previous,
        totais:{entradas:decimal(totals.entrada),saidas:decimal(totals.saida),saldo:decimal(totals.entrada-totals.saida)},
        entradas:groups.entrada,saidas:groups.saida};
    },
    async fontes(user,period){
      const {rows}=await db.query(`SELECT f.id,f.nome,f.tipo,
        coalesce(sum(l.valor) FILTER(WHERE l.tipo='entrada'),0)::text AS entradas,
        coalesce(sum(l.valor) FILTER(WHERE l.tipo='saida'),0)::text AS saidas
        FROM fontes_destinos f LEFT JOIN lancamentos l ON l.fonte_destino_id=f.id
        AND l.usuario_id=f.usuario_id AND l.data BETWEEN $2 AND $3
        WHERE f.usuario_id=$1 GROUP BY f.id,f.nome,f.tipo ORDER BY lower(f.nome),f.id`,[user,period.inicio,period.fim]);
      return {periodo:{inicio:period.inicio,fim:period.fim},dados:rows.map(row=>({...row,
        entradas:decimal(bigCents(row.entradas)),saidas:decimal(bigCents(row.saidas)),
        saldo:row.tipo==='conta'?decimal(bigCents(row.entradas)-bigCents(row.saidas)):null}))};
    },
  };
}
