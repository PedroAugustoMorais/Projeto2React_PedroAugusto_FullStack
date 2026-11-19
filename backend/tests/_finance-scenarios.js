import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../src/config/app.js';
import {criarLancamentoModel} from '../src/models/lancamentos.js';
import {entryBody} from '../src/config/finance-validation.js';

export async function financeScenarios(db){
  const app=createApp({db,jwtSecret:'segredo-aleatorio-apenas-para-testes-2565935'});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const req=async(path,method='GET',body,token)=>{
    const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:response.status===204?null:await response.json()};
  };
  try{
    const a=(await req('/auth/login','POST',{email:'ana@example.com',senha:'Teste12345'})).data.token;
    const b=(await req('/auth/login','POST',{email:'bruno@example.com',senha:'Teste12345'})).data.token;
    assert.ok(a&&b);
    assert.equal((await req('/lancamentos')).status,401);
    const category=await req('/categorias','POST',{nome:'Assinaturas',tipo:'saida'},a);assert.equal(category.status,201);
    const cat=category.data.dado.id;
    assert.equal((await req('/categorias','POST',{nome:'ASSINATURAS',tipo:'saida'},a)).status,409);
    assert.equal((await req(`/categorias/${cat}`,'PUT',{nome:'Serviços',tipo:'saida'},a)).status,200);
    const cardBody={nome:'Cartão principal',tipo:'cartao_credito',dia_fechamento:3,dia_vencimento:10,limite:'3000.00'};
    assert.equal((await req('/fontes-destinos','POST',{nome:'Incompleto',tipo:'cartao_credito'},a)).status,400);
    const cardResult=await req('/fontes-destinos','POST',cardBody,a);assert.equal(cardResult.status,201);
    const card=cardResult.data.dado.id;
    assert.equal((await req('/fontes-destinos','POST',cardBody,a)).status,409);
    assert.equal((await req(`/fontes-destinos/${card}`,'PUT',{...cardBody,nome:'Cartão atualizado'},a)).status,200);
    const entry={tipo:'saida',descricao:'Compra de teste',valor:'100.00',data:'2026-11-19',categoria_id:cat,fonte_destino_id:card,total_parcelas:3};
    const created=await req('/lancamentos','POST',entry,a);assert.equal(created.status,201);
    assert.deepEqual(created.data.dados.map(x=>x.valor),['33.34','33.33','33.33']);
    const ids=created.data.dados.map(x=>x.id);
    assert.ok(created.data.dados.every(x=>x.grupo_parcelamento===created.data.dados[0].grupo_parcelamento));
    assert.ok(created.data.dados.every(x=>x.data==='2026-11-19'));
    const query='?inicio=2026-11-01&fim=2026-11-30&limite=1';
    const listed=await req('/lancamentos'+query,'GET',undefined,a);assert.equal(listed.status,200);
    assert.equal(listed.data.dados.length,1);assert.equal(listed.data.paginacao.total,3);assert.equal(listed.data.totais.saidas,'100.00');assert.equal(listed.data.totais.saldo,'-100.00');
    assert.equal((await req('/lancamentos'+query+'&pagina=2','GET',undefined,a)).data.dados.length,1);
    assert.equal((await req('/lancamentos'+query,'GET',undefined,b)).data.dados.length,0);
    const update={...entry,valor:'33.34',descricao:'Primeira parcela editada'};delete update.total_parcelas;
    assert.equal((await req(`/lancamentos/${ids[0]}`,'PUT',update,a)).status,200);

    // Não basta esconder itens na interface: todas as operações filtram por dono.
    for(const [path,body] of [[`/categorias/${cat}`,{nome:'Invasão',tipo:'saida'}],[`/fontes-destinos/${card}`,cardBody],[`/lancamentos/${ids[0]}`,update]]){
      assert.equal((await req(path,'GET',undefined,b)).status,404);
      assert.equal((await req(path,'PUT',body,b)).status,404);
      assert.equal((await req(path,'DELETE',undefined,b)).status,404);
    }
    const brunoCategories=(await req('/categorias','GET',undefined,b)).data.dados;
    const brunoCategory=brunoCategories.find(x=>x.tipo==='saida').id;
    const brunoSource=(await req('/fontes-destinos','GET',undefined,b)).data.dados[0].id;
    assert.equal((await req('/lancamentos','POST',{...entry,categoria_id:brunoCategory},a)).status,400);
    assert.equal((await req('/lancamentos','POST',{...entry,fonte_destino_id:brunoSource},a)).status,400);
    const salary=(await req('/categorias','GET',undefined,a)).data.dados.find(x=>x.tipo==='entrada').id;
    assert.equal((await req('/lancamentos','POST',{...entry,categoria_id:salary},a)).status,400);
    assert.equal((await req(`/categorias/${cat}`,'DELETE',undefined,a)).status,409);
    assert.equal((await req(`/categorias/${cat}`,'PUT',{nome:'Serviços',tipo:'entrada'},a)).status,409);
    assert.equal((await req(`/fontes-destinos/${card}`,'DELETE',undefined,a)).status,409);
    assert.equal((await req(`/fontes-destinos/${card}`,'PUT',{nome:'Mudança',tipo:'conta'},a)).status,409);

    // Uma falha na segunda parcela não pode deixar a primeira gravada.
    const user=(await req('/auth/me','GET',undefined,a)).data.usuario.id;
    const brokenDb={async connect(){const connection=await db.connect();let inserts=0;return {release:()=>connection.release(),query(sql,args){if(sql.includes('INSERT INTO lancamentos')&&++inserts===2)throw new Error('Falha simulada');return connection.query(sql,args);}};}};
    await assert.rejects(criarLancamentoModel(brokenDb).criar(user,entryBody({...entry,descricao:'Deve reverter'})));
    assert.equal((await db.query("SELECT count(*)::int AS n FROM lancamentos WHERE descricao='Deve reverter'")).rows[0].n,0);

    assert.equal((await req(`/lancamentos/${ids[0]}?escopo=parcela`,'DELETE',undefined,a)).status,204);
    assert.equal((await req('/lancamentos'+query,'GET',undefined,a)).data.paginacao.total,2);
    assert.equal((await req(`/lancamentos/${ids[1]}?escopo=compra`,'DELETE',undefined,a)).status,204);
    assert.equal((await req('/lancamentos'+query,'GET',undefined,a)).data.paginacao.total,0);
    assert.equal((await req(`/categorias/${cat}`,'DELETE',undefined,a)).status,204);
    assert.equal((await req(`/fontes-destinos/${card}`,'DELETE',undefined,a)).status,204);
    assert.equal((await req(`/lancamentos/${ids[0]}`,'GET',undefined,a)).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
}
