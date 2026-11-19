import 'dotenv/config';

const base = `http://localhost:${process.env.PORT ?? 3000}`;
async function request(path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, data: await response.json() };
}
try {
  const health = await request('/health');
  if (health.status !== 200) throw new Error('API indisponível.');
  const denied = await request('/api/auth/me');
  if (denied.status !== 401) throw new Error('A rota sem token deveria retornar 401.');
  const login = await request('/api/auth/login', { email: 'ana@example.com', senha: 'Demo12345' });
  if (login.status !== 200 || !login.data.token) throw new Error('Não foi possível entrar com a conta do seed. Rode db:seed e confira a mensagem no servidor.');
  const me = await request('/api/auth/me', undefined, login.data.token);
  if (me.status !== 200 || me.data.usuario.email !== 'ana@example.com') throw new Error('Identidade não corresponde à sessão.');
  if (JSON.stringify([login.data, me.data]).includes('senha_hash')) throw new Error('Uma resposta expôs o hash.');
  const expired = await request('/api/auth/me', undefined, 'token-invalido');
  if (expired.status !== 401) throw new Error('Token inválido deveria retornar 401.');
  console.table([
    { verificacao: 'API disponível', resultado: 'OK' },
    { verificacao: 'Sem token: 401', resultado: 'OK' },
    { verificacao: 'Login de Ana', resultado: 'OK' },
    { verificacao: 'Consulta autenticada /me', resultado: 'OK' },
    { verificacao: 'Hash ausente nas respostas', resultado: 'OK' },
    { verificacao: 'Token inválido: 401', resultado: 'OK' },
  ]);
} catch (error) {
  console.error('Verificação falhou:', error.message);
  process.exitCode = 1;
}
