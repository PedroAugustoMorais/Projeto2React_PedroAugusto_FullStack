import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { criarUsuarioModel } from '../models/usuarios.js';
import { validarCadastro, validarLogin } from '../config/validation.js';
import { jwtAudience, jwtIssuer } from '../config/auth.js';
import { AppError } from '../config/errors.js';
import { criarAutenticacao } from '../middlewares/autenticar.js';

export function criarRotasAuth({ db, jwtSecret, loginLimit = 10, registrationLimit = 10 }) {
  const router = Router();
  const usuarios = criarUsuarioModel(db);
  const dummyHash = bcrypt.hashSync('HashParaComparacaoDeUsuarioInexistente123', 12);
  const options = {
    windowMs: 15 * 60 * 1000, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }),
  };
  const loginLimiter = rateLimit({ ...options, limit: loginLimit, skipSuccessfulRequests: true });
  const cadastroLimiter = rateLimit({ ...options, limit: registrationLimit });

  router.post('/cadastro', cadastroLimiter, async (req, res) => {
    const data = validarCadastro(req.body);
    const senhaHash = await bcrypt.hash(data.senha, 12);
    const usuario = await usuarios.criar({ ...data, senhaHash });
    res.status(201).json({ usuario });
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, senha } = validarLogin(req.body);
    const usuario = await usuarios.buscarCredenciais(email);
    // Bcrypt limita a entrada a 72 bytes; senhas maiores nunca são aceitas.
    const correct = await bcrypt.compare(Buffer.byteLength(senha) <= 72 ? senha : 'senha_invalida', usuario?.senha_hash ?? dummyHash);
    if (!usuario || !correct || Buffer.byteLength(senha) > 72) throw new AppError(401, 'E-mail ou senha inválidos.');
    const { senha_hash, ...publicUser } = usuario;
    const token = jwt.sign({}, jwtSecret, {
      subject: String(usuario.id), algorithm: 'HS256', expiresIn: '1h', issuer: jwtIssuer, audience: jwtAudience,
    });
    res.json({ token, usuario: publicUser, expiresIn: 3600 });
  });

  router.get('/me', criarAutenticacao(jwtSecret), async (req, res) => {
    const usuario = await usuarios.buscarPorId(req.usuarioId);
    if (!usuario) throw new AppError(401, 'Sessão inválida. Entre novamente.');
    res.json({ usuario });
  });
  return router;
}
