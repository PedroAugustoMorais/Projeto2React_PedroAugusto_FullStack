import jwt from 'jsonwebtoken';
import { jwtAudience, jwtIssuer } from '../config/auth.js';
import { AppError } from '../config/errors.js';

export function criarAutenticacao(secret) {
  return (req, res, next) => {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/.exec(authorization);
    if (!match) return next(new AppError(401, 'Token não informado ou inválido.'));
    try {
      const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer: jwtIssuer, audience: jwtAudience });
      if (typeof payload !== 'object' || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub) || !Number.isSafeInteger(Number(payload.sub)) || typeof payload.exp !== 'number') {
        throw new Error('Identidade inválida.');
      }
      req.usuarioId = Number(payload.sub);
      next();
    } catch {
      next(new AppError(401, 'Token inválido ou expirado.'));
    }
  };
}
