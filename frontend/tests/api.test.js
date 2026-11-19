import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {api,storeToken,readToken} from '../src/services/api.js';
const original={fetch:globalThis.fetch,window:globalThis.window,storage:globalThis.sessionStorage};
function setup(){const map=new Map();globalThis.sessionStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};globalThis.window=new EventTarget();}
afterEach(()=>{globalThis.fetch=original.fetch;globalThis.window=original.window;globalThis.sessionStorage=original.storage;});
test('cliente HTTP envia token e JSON em um único ponto',async()=>{
  setup();storeToken('token-ficticio');
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/categorias');assert.equal(options.headers.Authorization,'Bearer token-ficticio');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).nome,'Teste');return new Response(JSON.stringify({dado:{id:1}}),{status:201});};
  assert.deepEqual(await api('/categorias',{method:'POST',body:{nome:'Teste'}}),{dado:{id:1}});
});
test('401 de rota protegida apaga sessão e avisa AuthContext',async()=>{
  setup();storeToken('token-ficticio');let ended=false;window.addEventListener('conta-clara:session-ended',()=>ended=true);
  globalThis.fetch=async()=>new Response(JSON.stringify({erro:'Expirou'}),{status:401});
  await assert.rejects(api('/auth/me'),e=>e.status===401);assert.equal(readToken(),null);assert.equal(ended,true);
});
test('falha de login público preserva sessão e erros associados aos campos',async()=>{
  setup();storeToken('token-ficticio');
  globalThis.fetch=async(_,options)=>{assert.equal(options.headers.Authorization,undefined);return new Response(JSON.stringify({erro:'Revise',campos:{email:'Inválido'}}),{status:400});};
  await assert.rejects(api('/auth/login',{method:'POST',body:{},authenticated:false}),e=>e.fields.email==='Inválido');assert.equal(readToken(),'token-ficticio');
});
test('401 atrasado de sessão anterior não remove um novo login',async()=>{
  setup();storeToken('token-antigo');
  globalThis.fetch=async()=>{storeToken('token-novo');return new Response(JSON.stringify({erro:'Expirou'}),{status:401});};
  await assert.rejects(api('/auth/me'));assert.equal(readToken(),'token-novo');
});
test('exclusão 204, erro de conexão e abort são tratados',async()=>{
  setup();globalThis.fetch=async()=>new Response(null,{status:204});assert.equal(await api('/categorias/1',{method:'DELETE'}),undefined);
  globalThis.fetch=async()=>{throw new TypeError('network');};await assert.rejects(api('/categorias'),e=>e.message.includes('conectar à API'));
  globalThis.fetch=async()=>{throw new DOMException('Aborted','AbortError');};await assert.rejects(api('/categorias'),e=>e.name==='AbortError');
});
