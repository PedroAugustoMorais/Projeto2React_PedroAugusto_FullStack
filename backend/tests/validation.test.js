import test from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, validarCadastro, validarLogin } from '../src/config/validation.js';

const valid = { nome: 'Ana Teste', email: 'ana@example.com', cpf: '529.982.247-25', senha: 'Teste12345', confirmacaoSenha: 'Teste12345' };

test('CPF exige os dois dígitos verificadores e rejeita sequências e caracteres extras', () => {
  for (const cpf of ['529.982.247-25', '52998224725', '11144477735']) assert.equal(cpfValido(cpf), true);
  for (const cpf of ['52998224724','11111111111','00000000000','52998224725abc',null,52998224725]) assert.equal(cpfValido(cpf), false);
});

test('cadastro normaliza e-mail, nome e CPF, preserva senha e ignora id enviado', () => {
  const result = validarCadastro({ ...valid, nome: '  Ana   Teste  ', email: ' ANA@EXAMPLE.COM ', id: 999 });
  assert.deepEqual(result, { nome: 'Ana Teste', email: 'ana@example.com', cpf: '52998224725', senha: 'Teste12345' });
});

test('campos inválidos geram mensagens associadas ao campo', () => {
  assert.throws(() => validarCadastro({ nome: '', email: 'errado', cpf: '123', senha: '12345678', confirmacaoSenha: 'outra' }), e => {
    assert.equal(e.status, 400);
    assert.deepEqual(Object.keys(e.campos).sort(), ['nome','email','cpf','senha','confirmacaoSenha'].sort());
    return true;
  });
});

test('limite de bcrypt considera bytes UTF-8, sem truncar senha', () => {
  const senha = 'Ab1' + 'á'.repeat(35);
  assert.throws(() => validarCadastro({ ...valid, senha, confirmacaoSenha: senha }), e => e.status === 400 && !!e.campos.senha);
});

test('cadastro exige confirmação e rejeita corpos inválidos', () => {
  assert.throws(() => validarCadastro({ ...valid, confirmacaoSenha: undefined }), e => !!e.campos.confirmacaoSenha);
  for (const body of [null, [], 'texto']) assert.throws(() => validarCadastro(body), e => e.status === 400);
});

test('login normaliza e-mail sem alterar a senha', () => {
  assert.deepEqual(validarLogin({ email: ' ANA@EXAMPLE.COM ', senha: ' senha ' }), { email: 'ana@example.com', senha: ' senha ' });
  assert.throws(() => validarLogin({ email: '', senha: '' }), e => !!e.campos.email && !!e.campos.senha);
});
