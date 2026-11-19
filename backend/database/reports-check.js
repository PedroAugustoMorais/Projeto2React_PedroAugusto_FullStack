import 'dotenv/config';
import assert from 'node:assert/strict';
import {bigCents} from '../src/config/decimal.js';

const base=`http://localhost:${process.env.PORT??3000}/api`;
const report=[];
async function req(path,body,token){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  return {status:response.status,data:await response.json()};
}
const sum=(items,field)=>items.reduce((n,item)=>n+bigCents(item[field]),0n);
const ok=name=>report.push({verificacao:name,resultado:'OK'});
try{
  const login=async email=>{const r=await req('/auth/login',{email,senha:'Demo12345'});assert.equal(r.status,200,'Use os usuários do seed.');return r.data.token;};
  const a=await login('ana@example.com'),b=await login('bruno@example.com');
  const categories=await req('/relatorios/categorias',undefined,a);assert.equal(categories.status,200);
  assert.equal(sum(categories.data.saidas,'total'),bigCents(categories.data.totais.saidas));
  assert.equal(sum(categories.data.entradas,'total'),bigCents(categories.data.totais.entradas));ok('Relatório por categoria e totais');
  assert.ok(categories.data.periodo_anterior.inicio<categories.data.periodo.inicio);ok('Comparação com período anterior');
  const sources=await req('/relatorios/fontes-destinos',undefined,a);assert.equal(sources.status,200);
  assert.equal(sum(sources.data.dados,'saidas'),bigCents(categories.data.totais.saidas));
  for(const source of sources.data.dados.filter(x=>x.tipo==='conta'))assert.equal(bigCents(source.saldo),bigCents(source.entradas)-bigCents(source.saidas));ok('Relatório por fonte/destino e saldo');
  const entries=await req('/lancamentos?limite=1',undefined,a);assert.equal(entries.status,200);
  assert.equal(bigCents(entries.data.totais.saidas),bigCents(categories.data.totais.saidas));ok('Totais independentes da paginação');
  const invoices=await req('/faturas',undefined,a);assert.equal(invoices.status,200);
  assert.ok(invoices.data.cartoes.length>0,'O seed deve ter ao menos um cartão.');
  for(const card of invoices.data.cartoes){
    assert.equal(card.faturas.length,4);
    assert.equal(bigCents(card.limite_disponivel),bigCents(card.limite)-bigCents(card.limite_utilizado));
    for(const invoice of card.faturas)assert.equal(sum(invoice.lancamentos,'valor'),bigCents(invoice.total));
  }
  ok('Fatura aberta e próximas três');ok('Totais das faturas e limite disponível');
  assert.equal((await req(`/faturas?cartao_id=${invoices.data.cartoes[0].id}`,undefined,b)).status,404);ok('Cartão de outro usuário não é acessível');
  assert.equal((await req('/relatorios/categorias')).status,401);assert.equal((await req('/faturas')).status,401);ok('Relatórios e faturas exigem token');
  console.table(report);
}catch(error){console.error('Verificação de relatórios falhou:',error.message);process.exitCode=1;}
