import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFinancialHealth} from '../src/config/financial-health.js';

const row=(data,tipo,valor)=>({data,tipo,valor,fonte_tipo:'conta',parcela_atual:1,total_parcelas:1});
const history=()=>['2026-09-05','2026-10-05'].flatMap(data=>[row(data,'entrada','1000.00'),row(data,'saida','400.00')]);
const purchase=(data)=>['33.34','33.33','33.33'].map((valor,index)=>({...row(data,'saida',valor),fonte_tipo:'cartao_credito',dia_fechamento:3,dia_vencimento:10,parcela_atual:index+1,total_parcelas:3}));

test('saúde calcula indicadores, parcelas futuras e projeção com centavos exatos',()=>{
  const data=calculateFinancialHealth([...history(),row('2026-11-05','entrada','1000.00'),row('2026-11-05','saida','500.00'),...purchase('2026-11-02')],'2026-11');
  assert.equal(data.indicadores.taxa_sobra_percentual,46.67);
  assert.equal(data.indicadores.comprometimento_cartoes_percentual,2.22);
  assert.equal(data.indicadores.parcelas_futuras_total,'66.66');assert.equal(data.indicadores.parcelas_futuras_quantidade,2);
  assert.equal(data.indicadores.renda_media_mensal,'1000.00');assert.equal(data.indicadores.saidas_regulares_media,'400.00');
  assert.deepEqual(data.projecao.map(r=>r.variacao_mensal),['566.67','566.67','600.00']);
  assert.equal(data.projecao[2].variacao_acumulada,'1733.34');
  assert.equal(data.periodo_historico.meses_com_registros,2);assert.ok(data.dicas.some(d=>d.titulo==='Histórico parcial'));
  assert.doesNotThrow(()=>JSON.stringify(data));
});
test('sem registros não gera percentuais ou renda fictícia',()=>{
  const data=calculateFinancialHealth([],'2026-11');
  assert.equal(data.indicadores.taxa_sobra_percentual,null);assert.equal(data.indicadores.comprometimento_cartoes_percentual,null);
  assert.equal(data.periodo_historico.meses_com_registros,0);assert.equal(data.projecao.length,3);
  assert.ok(data.projecao.every(r=>r.entradas_estimadas==='0.00'&&r.variacao_acumulada==='0.00'));
});
test('parcelas históricas não entram novamente na média de saídas regulares',()=>{
  const data=calculateFinancialHealth([...history(),...purchase('2026-09-02')],'2026-11');
  assert.equal(data.indicadores.saidas_regulares_media,'400.00');
  assert.equal(data.indicadores.parcelas_futuras_total,'0.00');
  assert.ok(data.projecao.every(r=>r.saidas_estimadas==='400.00'));
});
test('conhecidos maiores que a média substituem a base, sem serem somados duas vezes',()=>{
  const data=calculateFinancialHealth([...history(),row('2026-12-05','entrada','2000.00'),row('2026-12-05','saida','600.00')],'2026-11');
  assert.equal(data.projecao[0].entradas_estimadas,'2000.00');assert.equal(data.projecao[0].saidas_regulares_estimadas,'600.00');
  assert.equal(data.projecao[0].variacao_mensal,'1400.00');
});
test('taxa negativa e cenário negativo são sinalizados sem tratar projeção como saldo',()=>{
  const data=calculateFinancialHealth([row('2026-10-05','entrada','100.00'),row('2026-10-05','saida','200.00'),row('2026-11-05','entrada','100.00'),row('2026-11-05','saida','150.00')],'2026-11');
  assert.equal(data.indicadores.taxa_sobra_percentual,-50);assert.equal(data.projecao[0].variacao_acumulada,'-100.00');
  assert.ok(data.dicas.some(d=>d.titulo==='Saídas acima das entradas'));assert.ok(data.dicas.some(d=>d.titulo==='Variação negativa no cenário'));
  assert.ok(data.aviso.includes('Não constituem recomendação'));
});
test('histórico e projeção atravessam virada do ano',()=>{
  const data=calculateFinancialHealth([],'2026-12');
  assert.deepEqual(data.projecao.map(r=>r.mes),['2027-01','2027-02','2027-03']);
  assert.deepEqual(data.historico.map(r=>r.mes),['2026-09','2026-10','2026-11']);
});
