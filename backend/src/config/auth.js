export const jwtIssuer = 'projeto2-financas';
export const jwtAudience = 'financas-frontend';

export function validateSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 || secret.startsWith('SUBSTITUA_')) {
    throw new Error('Defina JWT_SECRET no .env com pelo menos 32 bytes aleatórios. Consulte o README.');
  }
  return secret;
}
