import { AppError } from './errors.js';

export function cpfValido(value) {
  if (typeof value !== 'string' || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value)) return false;
  const d = value.replace(/\D/g, '');
  if (/^(\d)\1{10}$/.test(d)) return false;
  const digit = (size) => {
    let sum = 0;
    for (let i = 0; i < size; i++) sum += Number(d[i]) * (size + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const emailValido = (value) => value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\u0000-\u001f\u007f]/.test(value);

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'Envie um objeto JSON válido.');
}

export function validarCadastro(body) {
  bodyObject(body);
  const nome = clean(body.nome).replace(/\s+/g, ' ');
  const email = clean(body.email).toLowerCase();
  const cpf = clean(body.cpf);
  const senha = typeof body.senha === 'string' ? body.senha : '';
  const campos = {};
  if (nome.length < 3 || nome.length > 120 || /[\u0000-\u001f\u007f<>]/.test(nome)) campos.nome = 'Informe um nome de 3 a 120 caracteres.';
  if (!emailValido(email)) campos.email = 'Informe um e-mail válido.';
  if (!cpfValido(cpf)) campos.cpf = 'Informe um CPF válido, incluindo os dígitos verificadores.';
  if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha) || Buffer.byteLength(senha) > 72) {
    campos.senha = 'Use ao menos 8 caracteres, com letras e números, e no máximo 72 bytes.';
  }
  if (typeof body.confirmacaoSenha !== 'string' || body.confirmacaoSenha !== senha || !body.confirmacaoSenha) {
    campos.confirmacaoSenha = 'A confirmação deve ser igual à senha.';
  }
  if (Object.keys(campos).length) throw new AppError(400, 'Revise os campos informados.', campos);
  // O usuário nunca pode definir seu id ou campos de persistência pelo corpo.
  return { nome, email, cpf: cpf.replace(/\D/g, ''), senha };
}

export function validarLogin(body) {
  bodyObject(body);
  const email = clean(body.email).toLowerCase();
  const senha = typeof body.senha === 'string' ? body.senha : '';
  const campos = {};
  if (!emailValido(email)) campos.email = 'Informe um e-mail válido.';
  if (!senha) campos.senha = 'Informe sua senha.';
  if (Object.keys(campos).length) throw new AppError(400, 'Revise os campos informados.', campos);
  return { email, senha };
}
