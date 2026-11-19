import test from 'node:test';
import assert from 'node:assert/strict';
import {calcularFatura,nextInvoices,previousPeriod} from '../src/config/finance-dates.js';
import {bigCents,decimal,percentage,change} from '../src/config/decimal.js';

test('quatro exemplos de faturas fornecidos no enunciado',()=>{
  assert.deepEqual(calcularFatura('2026-11-02',{dia_fechamento:3,dia_vencimento:10}),{referencia:'2026-11',fechamento:'2026-11-03',vencimento:'2026-11-10'});
  assert.deepEqual(calcularFatura('2026-11-03',{dia_fechamento:3,dia_vencimento:10}),{referencia:'2026-12',fechamento:'2026-12-03',vencimento:'2026-12-10'});
  assert.deepEqual(calcularFatura('2026-12-28',{dia_fechamento:25,dia_vencimento:5}),{referencia:'2027-02',fechamento:'2027-01-25',vencimento:'2027-02-05'});
  assert.deepEqual(calcularFatura('2026-12-20',{dia_fechamento:25,dia_vencimento:5},3),{referencia:'2027-03',fechamento:'2027-02-25',vencimento:'2027-03-05'});
});
test('fechamento ajusta dia 31 em fevereiro e trata ano bissexto',()=>{
  const card={dia_fechamento:31,dia_vencimento:5};
  assert.equal(calcularFatura('2026-02-27',card).fechamento,'2026-02-28');
  assert.equal(calcularFatura('2026-02-28',card).fechamento,'2026-03-31');
  assert.equal(calcularFatura('2028-02-28',card).fechamento,'2028-02-29');
  assert.equal(calcularFatura('2028-02-29',card).fechamento,'2028-03-31');
});
test('vencimento igual ao fechamento fica no mês seguinte',()=>{
  assert.equal(calcularFatura('2026-01-01',{dia_fechamento:31,dia_vencimento:31}).vencimento,'2026-02-28');
});
test('projeção começa na fatura aberta e apresenta mais três',()=>{
  const card={dia_fechamento:3,dia_vencimento:10};
  assert.deepEqual(nextInvoices('2026-11-02',card).map(i=>i.referencia),['2026-11','2026-12','2027-01','2027-02']);
  assert.deepEqual(nextInvoices('2026-11-03',card).map(i=>i.referencia),['2026-12','2027-01','2027-02','2027-03']);
});
test('período anterior usa mês civil completo ou o mesmo número de dias',()=>{
  assert.deepEqual(previousPeriod('2026-10-01','2026-10-31'),{inicio:'2026-09-01',fim:'2026-09-30',regra:'mes_anterior'});
  assert.deepEqual(previousPeriod('2026-11-10','2026-11-15'),{inicio:'2026-11-04',fim:'2026-11-09',regra:'mesma_quantidade_de_dias'});
});
test('somatórios monetários não perdem precisão e comparação sem base não inventa percentual',()=>{
  const amount=bigCents('99999999999999999.99')+bigCents('0.01');
  assert.equal(decimal(amount),'100000000000000000.00');assert.equal(decimal(-100n),'-1.00');
  assert.equal(percentage(1n,3n),33.33);assert.equal(percentage(0n,0n),0);
  assert.equal(change(300n,150n),100);assert.equal(change(0n,100n),-100);assert.equal(change(100n,0n),null);
});
