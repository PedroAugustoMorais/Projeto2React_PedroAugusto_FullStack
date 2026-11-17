import { AppError } from '../config/errors.js';

export function tratarErros(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ erro: 'O conteúdo da requisição excede o limite permitido.' });
  if (error instanceof AppError) {
    return res.status(error.status).json({ erro: error.message, ...(error.campos ? { campos: error.campos } : {}) });
  }
  // Nunca registra corpo, senha, token ou detalhes de uma consulta SQL.
  console.error('Erro interno na API:', error.code ?? error.name);
  res.status(500).json({ erro: 'Não foi possível concluir a operação. Tente novamente.' });
}
