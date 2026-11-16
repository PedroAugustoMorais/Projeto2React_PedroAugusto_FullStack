import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';

const people = [
  { nome: 'Ana Demonstração', email: 'ana@example.com', cpf: '52998224725', renda: '4500.00' },
  { nome: 'Bruno Demonstração', email: 'bruno@example.com', cpf: '11144477735', renda: '6200.00' },
];
const categories = [
  ['Salário', 'entrada'], ['Outras receitas', 'entrada'], ['Alimentação', 'saida'],
  ['Moradia', 'saida'], ['Saúde', 'saida'], ['Mobilidade', 'saida'],
  ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];

export async function seed() {
  const hash = await bcrypt.hash('Demo12345', 12);
  const client = await pool.connect();
  let created = 0;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(2565935)');
    for (const person of people) {
      // Usuário existente nunca tem os dados alterados pelo seed.
      const existing = await client.query('SELECT id FROM usuarios WHERE email = $1 OR cpf = $2', [person.email, person.cpf]);
      if (existing.rows.length) continue;
      const result = await client.query(`INSERT INTO usuarios (nome,email,cpf,senha_hash)
        VALUES ($1,$2,$3,$4) RETURNING id`, [person.nome, person.email, person.cpf, hash]);
      const userId = result.rows[0].id;
      const categoryIds = {};
      for (const [name, type] of categories) {
        const r = await client.query('INSERT INTO categorias (usuario_id,nome,tipo) VALUES ($1,$2,$3) RETURNING id', [userId, name, type]);
        categoryIds[name] = r.rows[0].id;
      }
      const account = await client.query(`INSERT INTO fontes_destinos (usuario_id,nome,tipo) VALUES ($1,'Conta corrente','conta') RETURNING id`, [userId]);
      await client.query(`INSERT INTO fontes_destinos (usuario_id,nome,tipo) VALUES ($1,'Trabalho','renda')`, [userId]);
      const card = await client.query(`INSERT INTO fontes_destinos (usuario_id,nome,tipo,dia_fechamento,dia_vencimento,limite)
        VALUES ($1,'Cartão demonstração','cartao_credito',3,10,5000.00) RETURNING id`, [userId]);
      const now = new Date();
      for (let offset = -2; offset <= 0; offset++) {
        const month = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
        const prefix = month.toISOString().slice(0, 7);
        const entries = [
          ['entrada', 'Salário', person.renda, '05', 'Salário mensal'],
          ['saida', 'Moradia', '1200.00', '06', 'Aluguel'],
          ['saida', 'Alimentação', '450.50', '08', 'Supermercado'],
          ['saida', 'Mobilidade', '180.00', '12', 'Transporte'],
          ['saida', 'Lazer', '95.00', '15', 'Cinema e lazer'],
        ];
        for (const [type, category, amount, day, description] of entries) {
          await client.query(`INSERT INTO lancamentos
            (usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [userId, type, description, amount, `${prefix}-${day}`, categoryIds[category], account.rows[0].id]);
        }
        // R$ 100,00 / 3 = R$ 33,34 + R$ 33,33 + R$ 33,33.
        // Todas as parcelas mantêm a data original da compra, como permite RF9.
        const group = randomUUID();
        for (let installment = 1; installment <= 3; installment++) {
          await client.query(`INSERT INTO lancamentos
            (usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id,parcela_atual,total_parcelas,grupo_parcelamento)
            VALUES ($1,'saida',$2,$3,$4,$5,$6,$7,3,$8)`,
          [userId, 'Curso parcelado', installment === 1 ? '33.34' : '33.33', `${prefix}-03`,
            categoryIds.Educação, card.rows[0].id, installment, group]);
        }
      }
      created++;
    }
    await client.query('COMMIT');
    console.log(`${created} usuário(s) de demonstração criado(s). Os existentes foram preservados.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
