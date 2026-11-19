import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, money, installments,dateISO,sourceBody,entryBody,entryFilters } from '../src/config/finance-validation.js';

test('dinheiro é convertido sem arredondamento silencioso e centavos são preservados',()=>{
  assert.equal(cents('100.01'),10001);assert.equal(money(cents('0.10')),'0.10');
  for(const value of [0,-1,'1.001','1,20',Infinity,null,true]) assert.throws(()=>cents(value),e=>e.status===400);
  assert.deepEqual(installments(10000,3),[3334,3333,3333]);
  for(let count=1;count<=48;count++) assert.equal(installments(10001,count).reduce((a,b)=>a+b,0),10001);
});
test('datas inválidas e períodos invertidos são rejeitados',()=>{
  assert.equal(dateISO('2028-02-29'),'2028-02-29');
  for(const value of ['2026-02-29','2026-04-31','2026-1-01','1899-12-31']) assert.throws(()=>dateISO(value));
  assert.throws(()=>entryFilters({inicio:'2026-11-20',fim:'2026-11-01'}));
  assert.throws(()=>entryFilters({limite:'101'}));assert.throws(()=>entryFilters({pagina:'0'}));
});
test('cartão exige fechamento, vencimento e limite',()=>{
  assert.throws(()=>sourceBody({nome:'Cartão',tipo:'cartao_credito'}));
  assert.equal(sourceBody({nome:'Cartão',tipo:'cartao_credito',dia_fechamento:31,dia_vencimento:5,limite:'1000.00'}).limite,'1000.00');
  assert.throws(()=>sourceBody({nome:'Conta',tipo:'conta',limite:'100.00'}));
});
test('parcelamento exige parcelas positivas e valor suficiente',()=>{
  const body={tipo:'saida',descricao:'Compra',valor:'0.01',data:'2026-11-19',categoria_id:1,fonte_destino_id:1,total_parcelas:2};
  assert.throws(()=>entryBody(body));
  assert.throws(()=>entryBody({...body,valor:'100',total_parcelas:49}));
  assert.throws(()=>entryBody({...body,valor:'100'}, {updating:true}));
});
