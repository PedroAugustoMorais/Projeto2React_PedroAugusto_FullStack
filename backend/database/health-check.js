import 'dotenv/config';
import assert from 'node:assert/strict';
import {bigCents} from '../src/config/decimal.js';
const base=`http://localhost:${process.env.PORT??3000}/api`;
async function request(path,token,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json()};}
const report=[],ok=verificacao=>report.push({verificacao,resultado:'OK'});
try{
  assert.equal((await request('/saude-financeira')).status,401);ok('Página exige token');
  const login=await request('/auth/login',undefined,{email:'ana@example.com',senha:'Demo12345'});assert.equal(login.status,200);
  const token=login.data.token,result=await request('/saude-financeira',token);assert.equal(result.status,200);const data=result.data;ok('Análise autenticada disponível');
  for(const key of ['taxa_sobra_percentual','comprometimento_cartoes_percentual','parcelas_futuras_total'])assert.ok(Object.hasOwn(data.indicadores,key));ok('Três indicadores disponíveis');
  assert.equal(data.historico.length,3);assert.ok(data.periodo_historico.meses_com_registros<=3);ok('Histórico de três meses');
  assert.equal(data.projecao.length,3);ok('Projeção dos próximos três meses');
  let total=0n;
  for(const row of data.projecao){const net=bigCents(row.entradas_estimadas)-bigCents(row.saidas_regulares_estimadas)-bigCents(row.parcelas_conhecidas);total+=net;assert.equal(bigCents(row.variacao_mensal),net);assert.equal(bigCents(row.variacao_acumulada),total);}ok('Cálculos da projeção coerentes');
  assert.ok(data.dicas.length>0);assert.ok(data.aviso.includes('Não constituem recomendação'));ok('Dicas e aviso educativo');
  const other=await request('/saude-financeira?usuario_id=999999',token);assert.deepEqual(other.data,data);ok('Usuário vem do token, não da URL');
  console.table(report);
}catch(error){console.error('Verificação de saúde financeira falhou:',error.message);process.exitCode=1;}
