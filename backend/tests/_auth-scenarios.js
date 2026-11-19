import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/config/app.js';
import { criarUsuarioModel } from '../src/models/usuarios.js';
import { jwtAudience, jwtIssuer } from '../src/config/auth.js';

export async function authScenarios(db) {
  const secret = 'segredo-aleatorio-apenas-para-testes-2565935';
  const app = createApp({ db, jwtSecret: secret, registrationLimit: 100 });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, body, token, headers = {}) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    assert.equal(JSON.stringify(data).includes('senha_hash'), false);
    return { status: response.status, data, headers: response.headers };
  };
  const user = { nome: 'Ana Teste', email: ' ANA@EXAMPLE.COM ', cpf: '529.982.247-25', senha: 'Teste12345', confirmacaoSenha: 'Teste12345' };
  try {
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/api/auth/cadastro', {})).status, 400);
    const registered = await request('/api/auth/cadastro', user);
    assert.equal(registered.status, 201);
    const id = registered.data.usuario.id;
    assert.equal(registered.data.usuario.email, 'ana@example.com');
    const stored = (await db.query('SELECT senha_hash FROM usuarios WHERE id = $1',[id])).rows[0];
    assert.notEqual(stored.senha_hash, user.senha);
    assert.ok(await bcrypt.compare(user.senha,stored.senha_hash));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM categorias WHERE usuario_id=$1',[id])).rows[0].n,9);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM fontes_destinos WHERE usuario_id=$1',[id])).rows[0].n,1);

    const emailDuplicate = await request('/api/auth/cadastro', { ...user, cpf: '11144477735' });
    assert.equal(emailDuplicate.status,409); assert.ok(emailDuplicate.data.campos.email);
    const cpfDuplicate = await request('/api/auth/cadastro', { ...user, email: 'outro@example.com',cpf:'52998224725' });
    assert.equal(cpfDuplicate.status,409); assert.ok(cpfDuplicate.data.campos.cpf);
    const concurrent = await Promise.all([
      request('/api/auth/cadastro', { ...user,email:'bruno@example.com',cpf:'11144477735' }),
      request('/api/auth/cadastro', { ...user,email:'BRUNO@EXAMPLE.COM',cpf:'111.444.777-35' }),
    ]);
    assert.deepEqual(concurrent.map(x=>x.status).sort(),[201,409]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,2);

    const wrong = await request('/api/auth/login',{email:'ana@example.com',senha:'Incorreta123'});
    const nonexistent = await request('/api/auth/login',{email:'naoexiste@example.com',senha:'Incorreta123'});
    assert.equal(wrong.status,401); assert.deepEqual(wrong.data,nonexistent.data);
    const login = await request('/api/auth/login',{email:'ANA@EXAMPLE.COM',senha:user.senha});
    assert.equal(login.status,200);
    const token = login.data.token;
    const payload = jwt.verify(token,secret,{issuer:jwtIssuer,audience:jwtAudience,algorithms:['HS256']});
    assert.equal(payload.sub,String(id)); assert.equal(payload.exp-payload.iat,3600);
    assert.equal((await request('/api/auth/me')).status,401);
    assert.equal((await request('/api/auth/me',undefined,'invalido')).status,401);
    const expired = jwt.sign({},secret,{subject:String(id),expiresIn:-1,issuer:jwtIssuer,audience:jwtAudience});
    assert.equal((await request('/api/auth/me',undefined,expired)).status,401);
    const otherSecret = jwt.sign({},'outro-segredo-aleatorio-para-teste',{subject:String(id),expiresIn:'1h',issuer:jwtIssuer,audience:jwtAudience});
    assert.equal((await request('/api/auth/me',undefined,otherSecret)).status,401);
    const me = await request('/api/auth/me?usuarioId=999',undefined,token);
    assert.equal(me.status,200); assert.equal(me.data.usuario.id,id);
    const brunoLogin = await request('/api/auth/login',{email:'bruno@example.com',senha:user.senha});
    const bruno = await request('/api/auth/me',undefined,brunoLogin.data.token);
    assert.notEqual(bruno.data.usuario.id,id);
    assert.equal((await request('/api/auth/me',undefined,token,{Origin:'https://nao-autorizado.example'})).status,403);
    const cors = await request('/api/auth/me',undefined,token,{Origin:'http://localhost:5173'});
    assert.equal(cors.headers.get('access-control-allow-origin'),'http://localhost:5173');
    assert.equal((await request('/rota-inexistente')).status,404);
    const malformed = await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{invalido'});
    assert.equal(malformed.status,400);

    // Falha na criação de padrões deve reverter também a criação do usuário.
    const brokenDb = { async connect() {
      const connection = await db.connect();
      return { release: () => connection.release(), query(sql,args) {
        if (sql.startsWith('INSERT INTO categorias')) throw new Error('Falha simulada.');
        return connection.query(sql,args);
      } };
    } };
    await assert.rejects(criarUsuarioModel(brokenDb).criar({nome:'Rollback Teste',email:'rollback@example.com',cpf:'12345678909',senhaHash:stored.senha_hash}));
    assert.equal((await db.query("SELECT count(*)::int AS n FROM usuarios WHERE email='rollback@example.com'")).rows[0].n,0);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }

  const limited = createApp({db,jwtSecret:secret,loginLimit:2}).listen(0,'127.0.0.1');
  await once(limited,'listening');
  try {
    const statuses=[];
    for (let i=0;i<3;i++) {
      const response=await fetch(`http://127.0.0.1:${limited.address().port}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ana@example.com',senha:'Incorreta123'})});
      statuses.push(response.status); await response.json();
    }
    assert.deepEqual(statuses,[401,401,429]);
  } finally {
    await new Promise(resolve=>limited.close(resolve));
  }
}
