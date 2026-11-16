CREATE TABLE usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL CHECK (length(btrim(nome)) >= 3),
  email VARCHAR(160) NOT NULL,
  cpf CHAR(11) NOT NULL,
  senha_hash VARCHAR(100) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_unique UNIQUE (email),
  CONSTRAINT usuarios_cpf_unique UNIQUE (cpf),
  CONSTRAINT usuarios_email_normalizado CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%._%'),
  CONSTRAINT usuarios_cpf_formato CHECK (cpf ~ '^[0-9]{11}$' AND cpf !~ '^([0-9])\1{10}$')
);

CREATE TABLE categorias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(60) NOT NULL CHECK (length(btrim(nome)) > 0 AND nome = btrim(nome)),
  tipo VARCHAR(7) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  UNIQUE (id, usuario_id, tipo)
);
-- Mesma categoria/tipo não pode ser repetida por diferenças de maiúsculas.
CREATE UNIQUE INDEX categorias_usuario_nome_tipo_unique ON categorias (usuario_id, lower(nome), tipo);

CREATE TABLE fontes_destinos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(60) NOT NULL CHECK (length(btrim(nome)) > 0 AND nome = btrim(nome)),
  tipo VARCHAR(14) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento SMALLINT CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite NUMERIC(12,2) CHECK (limite > 0),
  UNIQUE (id, usuario_id),
  CONSTRAINT fontes_campos_cartao CHECK (
    (tipo = 'cartao_credito' AND dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
    OR (tipo <> 'cartao_credito' AND dia_fechamento IS NULL AND dia_vencimento IS NULL AND limite IS NULL)
  )
);
CREATE UNIQUE INDEX fontes_usuario_nome_unique ON fontes_destinos (usuario_id, lower(nome));

CREATE TABLE lancamentos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(7) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao VARCHAR(120) NOT NULL CHECK (length(btrim(descricao)) > 0),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL,
  categoria_id INTEGER NOT NULL,
  fonte_destino_id INTEGER NOT NULL,
  parcela_atual SMALLINT NOT NULL DEFAULT 1,
  total_parcelas SMALLINT NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lancamentos_parcela_valida CHECK (parcela_atual BETWEEN 1 AND total_parcelas),
  CONSTRAINT lancamentos_grupo_obrigatorio CHECK (total_parcelas = 1 OR grupo_parcelamento IS NOT NULL),
  CONSTRAINT lancamentos_parcela_unique UNIQUE (grupo_parcelamento, parcela_atual),
  -- Além da futura validação na API, o banco garante posse e tipo da categoria.
  CONSTRAINT lancamentos_categoria_fk FOREIGN KEY (categoria_id, usuario_id, tipo)
    REFERENCES categorias (id, usuario_id, tipo) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_fonte_fk FOREIGN KEY (fonte_destino_id, usuario_id)
    REFERENCES fontes_destinos (id, usuario_id) ON DELETE RESTRICT
);
CREATE INDEX lancamentos_usuario_data_idx ON lancamentos (usuario_id, data);
CREATE INDEX lancamentos_categoria_idx ON lancamentos (categoria_id, usuario_id, tipo);
CREATE INDEX lancamentos_fonte_idx ON lancamentos (fonte_destino_id, usuario_id);
