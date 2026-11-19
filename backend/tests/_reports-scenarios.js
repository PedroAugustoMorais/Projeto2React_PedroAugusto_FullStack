import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../src/config/app.js';

export async function reportsScenarios(db){
  const server=createApp({db,jwtSecret:'segredo-aleatorio-apenas-para-testes-2565935'}).listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const req=async(path,method='GET',body,token)=>{
    const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:response.status===204?null:await response.json()};
  };
  try{
    const login=async email=>(await req('/auth/login','POST',{email,senha:'Teste12345'})).data.token;
    const a=await login('ana@example.com'),b=await login('bruno@example.com');assert.ok(a&&b);
    assert.equal((await req('/relatorios/categorias')).status,401);
    assert.equal((await req('/faturas')).status,401);
    const category=async name=>(await req('/categorias','POST',{nome:name,tipo:'saida'},a)).data.dado.id;
    const ca=await category('Relatório A'),cb=await category('Relatório B');
    const cats=(await req('/categorias','GET',undefined,a)).data.dados;
    const salary=cats.find(c=>c.tipo==='entrada').id;
    const account=(await req('/fontes-destinos','GET',undefined,a)).data.dados.find(s=>s.tipo==='conta').id;
    const card=(await req('/fontes-destinos','POST',{nome:'Fatura teste',tipo:'cartao_credito',dia_fechamento:3,dia_vencimento:10,limite:'150.00'},a)).data.dado.id;
    const add=async(tipo,cat,source,valor,data,count=1)=>{
      const result=await req('/lancamentos','POST',{tipo,descricao:'Relatório e fatura',categoria_id:cat,fonte_destino_id:source,valor,data,total_parcelas:count},a);
      assert.equal(result.status,201);return result.data.dados;
    };
    await add('saida',ca,card,'100.00','2026-11-02',3);
    await add('saida',ca,account,'200.00','2026-11-05');
    await add('saida',cb,account,'100.00','2026-11-08');
    await add('saida',ca,account,'150.00','2026-10-05');
    await add('entrada',salary,account,'1000.00','2026-11-05');
    const period='?inicio=2026-11-01&fim=2026-11-30';
    const byCat=(await req('/relatorios/categorias'+period,'GET',undefined,a)).data;
    assert.deepEqual(byCat.totais,{entradas:'1000.00',saidas:'400.00',saldo:'600.00'});
    assert.equal(byCat.saidas[0].id,ca);assert.equal(byCat.saidas[0].total,'300.00');
    assert.equal(byCat.saidas[0].percentual,75);assert.equal(byCat.saidas[0].periodo_anterior,'150.00');assert.equal(byCat.saidas[0].variacao_percentual,100);
    assert.equal(byCat.saidas[1].variacao_percentual,null);assert.equal(byCat.saidas[1].tendencia,'novo');
    assert.equal(byCat.periodo_anterior.inicio,'2026-10-01');
    const bySource=(await req('/relatorios/fontes-destinos'+period,'GET',undefined,a)).data.dados;
    assert.equal(bySource.find(s=>s.id===account).saldo,'700.00');
    assert.equal(bySource.find(s=>s.id===card).saidas,'100.00');assert.equal(bySource.find(s=>s.id===card).saldo,null);
    const first=(await req(`/faturas?cartao_id=${card}&data_referencia=2026-11-02`,'GET',undefined,a)).data.cartoes[0];
    assert.equal(first.faturas.length,4);assert.equal(first.limite_utilizado,'100.00');assert.equal(first.limite_disponivel,'50.00');
    assert.deepEqual(first.faturas.map(i=>i.total),['33.34','33.33','33.33','0.00']);
    assert.equal(first.faturas[2].lancamentos[0].parcela,'3/3');
    const due=(await req(`/faturas?cartao_id=${card}&data_referencia=2026-11-10`,'GET',undefined,a)).data.cartoes[0];
    assert.equal(due.limite_utilizado,'100.00');assert.equal(due.faturas_fechadas_a_vencer[0].total,'33.34');
    const after=(await req(`/faturas?cartao_id=${card}&data_referencia=2026-11-11`,'GET',undefined,a)).data.cartoes[0];
    assert.equal(after.limite_utilizado,'66.66');assert.equal(after.limite_disponivel,'83.34');
    await add('saida',cb,card,'60.00','2026-11-03');
    const closing=(await req(`/faturas?cartao_id=${card}&data_referencia=2026-11-03`,'GET',undefined,a)).data.cartoes[0];
    assert.equal(closing.faturas[0].referencia,'2026-12');assert.equal(closing.faturas[0].total,'93.33');
    assert.equal(closing.limite_utilizado,'160.00');assert.equal(closing.limite_disponivel,'-10.00');assert.equal(closing.acima_do_limite,true);
    await add('saida',cb,card,'48.00','2026-11-03',48);
    const longTerm=(await req(`/faturas?cartao_id=${card}&data_referencia=2026-11-03`,'GET',undefined,a)).data.cartoes[0];
    assert.equal(longTerm.limite_utilizado,'208.00');
    assert.equal(longTerm.faturas.length,4);
    assert.equal(longTerm.faturas[3].lancamentos.find(l=>l.total_parcelas===48).parcela,'4/48');
    assert.equal((await req(`/faturas?cartao_id=${card}`,'GET',undefined,b)).status,404);
    assert.deepEqual((await req('/faturas','GET',undefined,b)).data.cartoes,[]);
    const bruno=(await req('/relatorios/categorias'+period,'GET',undefined,b)).data;
    assert.equal(bruno.totais.saidas,'0.00');assert.deepEqual(bruno.saidas,[]);
    assert.equal((await req('/relatorios/categorias?inicio=2026-12-01&fim=2026-11-01','GET',undefined,a)).status,400);
    assert.equal((await req('/faturas?data_referencia=2026-02-30','GET',undefined,a)).status,400);
  }finally{await new Promise(resolve=>server.close(resolve));}
}
