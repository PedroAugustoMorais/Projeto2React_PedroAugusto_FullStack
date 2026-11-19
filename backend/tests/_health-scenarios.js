import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../src/config/app.js';

export async function healthScenarios(db){
  const server=createApp({db,jwtSecret:'segredo-aleatorio-apenas-para-testes-2565935'}).listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function request(path,token,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
  try{
    assert.equal((await request('/saude-financeira')).status,401);
    const login=async email=>(await request('/auth/login',undefined,{email,senha:'Teste12345'})).data.token;
    const a=await login('ana@example.com'),b=await login('bruno@example.com');
    const ana=await request('/saude-financeira?mes=2026-11',a);assert.equal(ana.status,200);assert.equal(ana.data.projecao.length,3);
    assert.ok(Number(ana.data.indicadores.parcelas_futuras_total)>0);
    const bruno=await request('/saude-financeira?mes=2026-11',b);assert.equal(bruno.data.indicadores.parcelas_futuras_total,'0.00');
    assert.equal(bruno.data.indicadores.taxa_sobra_percentual,null);assert.equal(bruno.data.periodo_historico.meses_com_registros,0);
    const ignored=await request('/saude-financeira?mes=2026-11&usuario_id=999',a);assert.deepEqual(ignored.data,ana.data);
    assert.equal((await request('/saude-financeira?mes=2026-13',a)).status,400);
    assert.equal((await request('/saude-financeira?mes=texto',a)).status,400);
  }finally{await new Promise(resolve=>server.close(resolve));}
}
