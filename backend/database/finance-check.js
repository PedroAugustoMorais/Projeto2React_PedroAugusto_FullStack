import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base=`http://localhost:${process.env.PORT ?? 3000}/api`;
const suffix=randomUUID().slice(0,8);
let token,cat,source,ids=[];
const report=[];
async function req(path,method='GET',body,auth=token){
  const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  const data=response.status===204?null:await response.json();
  return {status:response.status,data};
}
function check(name){report.push({verificacao:name,resultado:'OK'});}
try{
  const login=await req('/auth/login','POST',{email:'ana@example.com',senha:'Demo12345'},null);
  assert.equal(login.status,200,'Entre com a conta Ana do seed.');token=login.data.token;
  assert.equal((await req('/categorias')).status,200);check('Lista autenticada de categorias');
  let result=await req('/categorias','POST',{nome:`Teste ${suffix}`,tipo:'saida'});
  assert.equal(result.status,201);cat=result.data.dado.id;
  assert.equal((await req(`/categorias/${cat}`,'PUT',{nome:`Teste editado ${suffix}`,tipo:'saida'})).status,200);check('Criação e edição de categoria');
  const card={nome:`Cartão teste ${suffix}`,tipo:'cartao_credito',dia_fechamento:3,dia_vencimento:10,limite:'1000.00'};
  result=await req('/fontes-destinos','POST',card);assert.equal(result.status,201);source=result.data.dado.id;
  assert.equal((await req(`/fontes-destinos/${source}`,'PUT',{...card,limite:'2000.00'})).status,200);check('Criação e edição de cartão');
  const now=new Date();const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const entry={tipo:'saida',descricao:`Verificação ${suffix}`,valor:'100.00',data:date,categoria_id:cat,fonte_destino_id:source,total_parcelas:3};
  result=await req('/lancamentos','POST',entry);assert.equal(result.status,201);ids=result.data.dados.map(x=>x.id);
  assert.deepEqual(result.data.dados.map(x=>x.valor),['33.34','33.33','33.33']);check('R$ 100,00 em 3 parcelas exatas');
  const list=await req(`/lancamentos?inicio=${date}&fim=${date}&categoria_id=${cat}&limite=1`);
  assert.equal(list.data.dados.length,1);assert.equal(list.data.paginacao.total,3);assert.equal(list.data.totais.saidas,'100.00');check('Filtros, paginação e total completo');
  const bruno=await req('/auth/login','POST',{email:'bruno@example.com',senha:'Demo12345'},null);assert.equal(bruno.status,200);
  const edit={...entry,valor:'33.34'};delete edit.total_parcelas;
  for(const method of ['GET','PUT','DELETE']) assert.equal((await req(`/lancamentos/${ids[0]}`,method,method==='PUT'?edit:undefined,bruno.data.token)).status,404);
  check('Outro usuário não lê, edita ou exclui');
  assert.equal((await req(`/categorias/${cat}`,'DELETE')).status,409);
  assert.equal((await req(`/fontes-destinos/${source}`,'DELETE')).status,409);check('Exclusão de vínculos é bloqueada');
  assert.equal((await req(`/lancamentos/${ids[0]}`,'PUT',edit)).status,200);
  assert.equal((await req(`/lancamentos/${ids[0]}?escopo=parcela`,'DELETE')).status,204);
  assert.equal((await req(`/lancamentos/${ids[1]}?escopo=compra`,'DELETE')).status,204);ids=[];
  assert.equal((await req(`/categorias/${cat}`,'DELETE')).status,204);cat=undefined;
  assert.equal((await req(`/fontes-destinos/${source}`,'DELETE')).status,204);source=undefined;check('Edição, exclusão de parcela/compra e limpeza');
  console.table(report);
}catch(error){
  console.error('Verificação financeira falhou:',error.message);process.exitCode=1;
}finally{
  // Só remove os registros temporários criados por esta execução.
  for(const id of ids) {try{await req(`/lancamentos/${id}?escopo=compra`,'DELETE');}catch{}}
  for(const [path,id] of [['categorias',cat],['fontes-destinos',source]]) if(id){
    try{const r=await req(`/${path}/${id}`,'DELETE');if(![204,404].includes(r.status))console.error(`Não foi possível limpar ${path}/${id}.`);}catch{console.error(`Confira a limpeza de ${path}/${id}.`);}
  }
}
