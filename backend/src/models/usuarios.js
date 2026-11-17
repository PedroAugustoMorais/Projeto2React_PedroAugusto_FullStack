import { pool } from '../config/database.js';
import { AppError } from '../config/errors.js';

// Categorias criadas automaticamente no cadastro, iguais às do seed.
export const categoriasPadrao = [
  ['Salário', 'entrada'], ['Outras receitas', 'entrada'], ['Alimentação', 'saida'],
  ['Moradia', 'saida'], ['Saúde', 'saida'], ['Mobilidade', 'saida'],
  ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];

export function criarUsuarioModel(db = pool) {
  return {
    async criar({ nome, email, cpf, senhaHash }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`INSERT INTO usuarios (nome,email,cpf,senha_hash)
          VALUES ($1,$2,$3,$4) RETURNING id,nome,email,cpf,criado_em`, [nome,email,cpf,senhaHash]);
        const usuario = rows[0];
        for (const [name, type] of categoriasPadrao) {
          await client.query('INSERT INTO categorias (usuario_id,nome,tipo) VALUES ($1,$2,$3)', [usuario.id,name,type]);
        }
        await client.query(`INSERT INTO fontes_destinos (usuario_id,nome,tipo) VALUES ($1,'Conta corrente','conta')`, [usuario.id]);
        await client.query('COMMIT');
        return usuario;
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505' && ['usuarios_email_unique', 'usuarios_cpf_unique'].includes(error.constraint)) {
          const field = error.constraint === 'usuarios_cpf_unique' ? 'cpf' : 'email';
          throw new AppError(409, 'Usuário já cadastrado.', {
            [field]: `Já existe um usuário com este ${field === 'cpf' ? 'CPF' : 'e-mail'}.`,
          });
        }
        throw error;
      } finally {
        client.release();
      }
    },
    async buscarCredenciais(email) {
      const { rows } = await db.query('SELECT id,nome,email,cpf,criado_em,senha_hash FROM usuarios WHERE email = $1', [email]);
      return rows[0] ?? null;
    },
    async buscarPorId(id) {
      const { rows } = await db.query('SELECT id,nome,email,cpf,criado_em FROM usuarios WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
  };
}
