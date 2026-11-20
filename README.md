# MinhasContas — Controle financeiro pessoal

Projeto 2 da disciplina **Programação Web Full Stack**.

**Integrante:** Pedro Augusto da Silva Morais — RA 2565935.

Aplicação com API REST própria em Node.js/Express, banco PostgreSQL e SPA React. Permite cadastrar usuários, registrar entradas e saídas, organizar categorias e fontes/destinos, parcelar compras e consultar relatórios e faturas.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Backend | Node.js, Express 5, PostgreSQL, `pg` com pool de conexões |
| Autenticação | JWT com `jsonwebtoken`, senhas com `bcrypt` |
| Configuração e proteção | `dotenv`, `cors`, `express-rate-limit` |
| Frontend | React, Vite, React Router, Context API |
| Gráficos | Recharts |
| Estilos | CSS responsivo e ilustrações vetoriais SVG |
| Testes | Executor nativo `node:test` e `node:assert` |

O PostgreSQL foi escolhido e comunicado à professora. As bibliotecas utilizadas devem seguir a aprovação da disciplina. O frontend usa `fetch`, sem Axios, e CSS próprio, sem Material UI nesta implementação.

## Pré-requisitos

- Node.js **22.12 ou superior** e npm.
- PostgreSQL **16 ou superior**, instalado e em execução.
- Opcional: pgAdmin para criar e inspecionar o banco.

## Instalação do zero

### 1. Criar o banco

No pgAdmin, conectado ao servidor PostgreSQL, use **Databases → Create → Database** e crie `projeto2_financas`.

Alternativamente, conectado ao banco `postgres`, execute fora de uma transação:

```sql
CREATE DATABASE projeto2_financas;
```

### 2. Configurar o backend

Abra a pasta raiz do projeto no VS Code. Em um terminal CMD:

```cmd
cd backend
npm ci
copy .env.example .env
```

No macOS/Linux, a cópia é `cp .env.example .env`. Os comandos npm são iguais.

Edite `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/projeto2_financas
JWT_SECRET=COLE_UM_SEGREDO_ALEATORIO_AQUI
FRONTEND_ORIGIN=http://localhost:5173
```

Troque `SUA_SENHA` pela senha local do PostgreSQL. Caracteres reservados na senha, como `@`, `#` ou `%`, precisam de codificação de URL. Gere um segredo com este comando e copie o resultado para `JWT_SECRET`:

```cmd
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Não envie o `.env` ao GitHub. O `.env.example` deve permanecer versionado. O servidor rejeita segredos curtos e o placeholder inicial.

### 3. Criar tabelas e dados de demonstração

Ainda em `backend`:

```cmd
npm run db:migrate
npm run db:seed
npm run db:check
```

Em banco vazio: **2 usuários, 18 categorias, 6 fontes/destinos e 48 lançamentos em 3 meses**. Os meses são o atual e os dois anteriores no momento da carga. O seed não altera usuários já existentes com o mesmo e-mail ou CPF. As contagens podem ser diferentes se o banco já estiver em uso.

### 4. Iniciar a API

```cmd
npm run dev
```

Mantenha esse terminal aberto. Para verificar o processo, abra:

http://localhost:3000/health

Resultado esperado: `{"status":"ok"}`.

### 5. Iniciar o frontend

Abra **outro terminal** na raiz do projeto:

```cmd
cd frontend
npm ci
npm run dev
```

Abra o endereço **Local** informado pelo Vite:

http://localhost:5173

O frontend encaminha `/api` para `http://localhost:3000` pelo proxy do Vite. Não é necessário criar um `.env` no frontend no uso padrão. Para uma porta diferente do backend, o `frontend/.env.example` documenta `API_PROXY_TARGET`; ajuste também `FRONTEND_ORIGIN` no backend para a origem real do navegador.

Use `localhost:5173` com a configuração padrão. Acesso pelo endereço Network exige configurar `FRONTEND_ORIGIN` com o protocolo, IP e porta utilizados. CORS aceita apenas a origem configurada.

### Atualização de uma etapa anterior

Preserve `backend/.env`, seu banco e a pasta `.git`, se existir. Copie os arquivos novos sobre os anteriores e execute `npm ci` em cada pasta que recebeu novas dependências. A migration `001-inicial.sql` permanece idêntica às etapas anteriores; não recrie o banco. Nesta etapa, `frontend/` passa a conter a aplicação React.

## Contas de demonstração

| Nome | E-mail | Senha demonstrativa |
| --- | --- | --- |
| Ana Demonstração | ana@example.com | Demo12345 |
| Bruno Demonstração | bruno@example.com | Demo12345 |

A tela de login também oferece **Usar conta de demonstração**, que autentica a conta Ana pelo mesmo endpoint de login. Essas contas e senhas são públicas e se destinam apenas ao projeto local. Use dados fictícios na apresentação. Os CPFs do seed são exemplos matematicamente válidos para teste; não são dados dos integrantes.

## Telas e funcionalidades

| Tela | Funcionalidades |
| --- | --- |
| Cadastro | Nome, CPF com máscara, e-mail, senha e confirmação; erros por campo; duplicidade rejeitada pelo servidor |
| Login | Autenticação por e-mail e senha e acesso à demonstração |
| Visão geral | Resumo mensal, gráfico por categoria e últimos lançamentos |
| Lançamentos | CRUD, período/tipo/categoria/fonte, paginação e totais completos do filtro |
| Categorias | CRUD de categorias de entrada e saída |
| Fontes e destinos | CRUD de contas, rendas e cartões com fechamento, vencimento e limite |
| Relatórios | Categorias com percentuais e comparação anterior; fontes/destinos com gráfico e saldo das contas |
| Faturas | Fatura aberta, próximas três, parcelas, vencimentos e limite comprometido |
| Saúde financeira | Indicadores, projeção de três meses e dicas educativas calculadas no backend |

Há estados de carregamento, lista vazia e erro com nova tentativa. Formulários mostram os erros devolvidos pela API junto aos campos correspondentes. Exclusões pedem confirmação; em compras parceladas, o usuário escolhe excluir uma parcela ou todas as restantes.

O dashboard e os relatórios consomem agregações do servidor; os gráficos não recalculam os totais a partir de listas paginadas.

### Sessão e rotas protegidas

`AuthContext` disponibiliza usuário, token, `login`, `logout` e `cadastrar`. O token fica no **sessionStorage**, sobrevivendo ao recarregamento na mesma aba; o aplicativo confirma a identidade com `/api/auth/me` na inicialização. Login é necessário para acessar todas as telas financeiras.

`services/api.js` centraliza as requisições, adiciona `Authorization: Bearer <token>` e encerra a sessão em respostas `401` protegidas. A expiração também é acompanhada por um timer no frontend. Essa leitura do prazo não substitui a verificação criptográfica no servidor.

Logout descarta o token no navegador. Não há revogação antecipada: um token copiado continua válido até a expiração de uma hora. Fechar a aba encerra normalmente o sessionStorage, sujeito ao comportamento de restauração de sessão do navegador.

## Modelo de dados e integridade

- **usuarios:** nome, e-mail normalizado em minúsculas, CPF só com dígitos, hash e data de criação. E-mail e CPF possuem `UNIQUE` no banco.
- **categorias:** pertencem ao usuário e têm tipo entrada/saída. Unicidade por usuário, nome sem diferenciar maiúsculas e tipo, seguindo RF4 e o DDL de referência.
- **fontes_destinos:** pertencem ao usuário; tipos renda, conta ou cartão de crédito. Cartões exigem fechamento, vencimento e limite positivo.
- **lancamentos:** valor positivo em `NUMERIC(12,2)`, data, categoria, fonte/destino e identificação das parcelas.

Chaves estrangeiras compostas garantem que categoria e fonte/destino pertençam ao mesmo usuário do lançamento e que o tipo da categoria seja compatível. O servidor também faz essas validações. Acesso a um registro de outra pessoa retorna `404`, sem revelar sua existência.

Categoria ou fonte com lançamentos associados não pode ser excluída (`409`). Categoria não pode mudar de tipo se invalidar registros existentes; fonte/destino com lançamentos não pode mudar de tipo. Contas aceitam entradas e saídas; rendas aceitam entradas; cartões aceitam saídas.

O cadastro cria as categorias padrão e a conta corrente na **mesma transação** do usuário. A migration registra um checksum e rejeita alterações no SQL já aplicado. Novas alterações de esquema devem utilizar novas migrations.

## Valores, parcelas e datas

### Lançamentos

- Valores são positivos; o tipo determina entrada ou saída.
- Parcelamento disponível apenas para saídas em cartão de crédito, entre 1 e 48 parcelas.
- Na criação, `valor` representa o **total da compra**. A divisão usa centavos inteiros, com o resto na primeira parcela: R$ 100,00 em 3× = R$ 33,34 + R$ 33,33 + R$ 33,33.
- Cada parcela é um lançamento com o mesmo `grupo_parcelamento`. Todas são inseridas em uma transação; uma falha reverte a compra inteira.
- Todas as parcelas guardam a **data original da compra**, opção permitida pelo RF9. O índice da parcela é aplicado uma única vez ao calcular sua fatura.
- A edição altera **apenas a parcela selecionada**. O valor informado é o daquela parcela; a estrutura de parcelamento não é alterada.
- Filtros, totais e relatórios agrupam pela data da compra, incluindo suas parcelas. Não representam liquidação ou pagamento bancário. A visão por vencimento aparece em Faturas.

### Relatórios

As agregações usam `SUM` e `GROUP BY` no PostgreSQL. O saldo é entradas menos saídas. No relatório por fonte/destino, saldo é mostrado apenas para contas.

Um mês civil completo é comparado ao mês civil anterior, seguindo o exemplo do enunciado (outubro versus setembro). Outros intervalos são comparados aos dias imediatamente anteriores de mesma duração. Sem base anterior, a variação percentual é `null` e a interface mostra **Novo no período**. Percentuais são arredondados a duas casas e podem não somar exatamente 100%.

### Faturas

- Compra antes do dia de fechamento entra na fatura que fecha naquele mês.
- Compra no dia do fechamento ou depois entra na próxima.
- Parcela k entra k−1 meses depois da primeira.
- Se o dia do vencimento é maior que o de fechamento, o vencimento fica no mesmo mês; caso contrário, no seguinte.
- Dias inexistentes são ajustados ao último dia do mês, incluindo anos bissextos.
- O limite comprometido inclui **todas as parcelas ainda não vencidas**, mesmo além das quatro faturas exibidas. A parcela que vence na data de referência ainda é considerada comprometida.
- Faturas fechadas, mas ainda a vencer, aparecem separadamente quando existirem.
- Limite disponível pode ficar negativo; a interface sinaliza excesso, sem impedir o registro de gastos.
- Os limites exibidos referem-se à data consultada. Não há baixa de pagamento: excluir parcelas vencidas do comprometimento não afirma que foram realmente pagas.
- Alterar fechamento/vencimento de um cartão recalcula suas previsões, pois não há histórico imutável de ciclos nesta modelagem.

Dinheiro permanece em `NUMERIC` no banco e em strings decimais no JSON. Operações adicionais do servidor usam `BigInt` em centavos; a conversão para `Number` no frontend destina-se à apresentação em reais e aos gráficos.

## Rotas da API

Todas as rotas `/api` exigem JWT, exceto cadastro e login. `/health` é uma rota pública separada de diagnóstico.

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/health` | Disponibilidade do processo |
| POST | `/api/auth/cadastro` | Cadastrar usuário e padrões |
| POST | `/api/auth/login` | Entrar e receber JWT |
| GET | `/api/auth/me` | Consultar usuário autenticado |
| GET, POST | `/api/categorias` | Listar/criar categorias |
| GET, PUT, DELETE | `/api/categorias/:id` | Consultar/editar/excluir categoria |
| GET, POST | `/api/fontes-destinos` | Listar/criar fontes e destinos |
| GET, PUT, DELETE | `/api/fontes-destinos/:id` | Consultar/editar/excluir fonte/destino |
| GET, POST | `/api/lancamentos` | Listar/criar lançamento ou compra parcelada |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Consultar/editar/excluir parcela |
| GET | `/api/relatorios/categorias` | Totais, percentuais e comparação anterior |
| GET | `/api/relatorios/fontes-destinos` | Movimentações e saldo das contas |
| GET | `/api/faturas` | Previsão e limites dos cartões |
| GET | `/api/saude-financeira` | Indicadores, histórico, projeção e dicas do usuário |

Códigos principais: `200` em consulta/edição, `201` em criação, `204` em exclusão; `400` em validação, `401` sem token válido, `404` em registro inacessível, `409` em duplicidade/vínculo, `429` em excesso de tentativas.

Erro padronizado:

```json
{
  "erro": "Revise os campos informados.",
  "campos": { "cpf": "Informe um CPF válido." }
}
```

`campos` aparece quando o erro está associado a campos. Erros internos não expõem SQL, stack trace, senha ou hash.

### Parâmetros e corpos

- Cadastro: `nome`, `email`, `cpf`, `senha`, `confirmacaoSenha`.
- Login: `email`, `senha`. Resposta inclui `token`, `usuario`, `expiresIn` (3600 segundos).
- Categoria: `nome`, `tipo` (`entrada` ou `saida`).
- Fonte/destino: `nome`, `tipo` (`renda`, `conta`, `cartao_credito`); cartão também exige `dia_fechamento`, `dia_vencimento`, `limite`.
- Lançamento: `tipo`, `descricao`, `valor` (decimal com ponto), `data` (AAAA-MM-DD), `categoria_id`, `fonte_destino_id`; na criação, `total_parcelas` opcional (padrão 1).
- Edição de lançamento: envia os campos editáveis completos; não aceita alteração de `parcela_atual`, `total_parcelas` ou `grupo_parcelamento`.
- Exclusão de lançamento: `?escopo=parcela` (padrão) ou `?escopo=compra`.
- Lista de lançamentos: `inicio`, `fim`, `tipo`, `categoria_id`, `fonte_destino_id`, `pagina` (padrão 1), `limite` (padrão 20, máximo 100). Período padrão: mês corrente. Retorna `dados`, `periodo`, `paginacao` e `totais` de **todo o filtro**.
- Relatórios: `inicio`, `fim`; padrão mês corrente.
- Faturas: `cartao_id` e `data_referencia` opcionais; padrão todos os cartões do usuário e data local do servidor.

## Segurança

- Senhas com bcrypt, custo 12 e salt automático. Mínimo de oito caracteres, letras e números; máximo de 72 bytes para evitar truncamento do bcrypt.
- CPF validado pelos dois dígitos verificadores; e-mail e CPF normalizados antes da gravação. A garantia de unicidade é do banco.
- JWT HS256 com expiração, emissor e destinatário verificados. O usuário vem de `sub`, nunca de um `usuario_id` enviado pelo cliente.
- Consultas parametrizadas. Nomes SQL dinâmicos são metadados internos fixos, nunca texto de requisições.
- CORS restrito à origem configurada. Requisições sem Origin, como as de terminal, continuam exigindo autenticação nas rotas protegidas.
- Dez falhas de login por IP em 15 minutos; dez tentativas de cadastro por IP em 15 minutos. Limites locais ao processo nesta execução acadêmica.
- Limite de tamanho do JSON, validações no servidor e no cliente e mensagens genéricas para credenciais inválidas.
- Nenhuma resposta da API retorna `senha_hash`.

## Estrutura

```text
backend/
  database/                 SQL, migration, seed e verificações de execução
  src/
    server.js               inicialização do Express
    config/                 pool, app, validações e funções puras
    routes/                 rotas com seus controladores
    models/                 acesso ao banco e regras de persistência
    middlewares/            autenticação e tratamento central de erros
  tests/                    validação, regras e cenários HTTP
frontend/
  src/
    main.jsx                ponto de entrada
    styles.css              visual e responsividade
    components/             telas, formulários, gráficos e componentes comuns
    contexts/               AuthContext
    services/               cliente HTTP centralizado
  tests/                    cliente HTTP e formatação
```

Não há pasta `controllers`: os controladores estão nos arquivos de rotas, conforme o enunciado. Funções puras foram colocadas em `config`; operações no banco ficam em `models`. Os comandos de `database/` apenas iniciam e encerram as tarefas de persistência, ou consomem a API para verificação.

## Verificações e testes

Com o backend em execução, em outro terminal dentro de `backend`:

```cmd
npm run auth:check
npm run finance:check
npm run reports:check
npm run health:check
```

Resultados esperados: seis, oito, oito e oito verificações `OK`, respectivamente. Usam as contas do seed. `finance:check` cria dados temporários e os remove; os demais apenas consultam. Se o processo for interrompido durante o teste financeiro, podem restar registros nomeados `Teste` e `Cartão teste`; confira as mensagens de limpeza.

Testes unitários do backend:

```cmd
npm test
```

São **22 testes unitários**. O teste HTTP integrado ao PostgreSQL só executa quando `TEST_DATABASE_URL` estiver definido; caso contrário, aparece como **ignorado**, não como aprovado.

Para habilitá-lo, crie um banco separado, `projeto2_financas_test`, adicione ao `.env` a conexão abaixo com a senha local e execute `npm test` novamente:

```env
TEST_DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/projeto2_financas_test
```

O teste cria e remove um schema temporário com nome aleatório. A conta precisa ter permissão de criar schemas. Não use uma conexão de produção.

Dentro de `frontend`:

```cmd
npm test
npm run build
```

São **8 testes** de cliente HTTP e formatação. O build gera `frontend/dist`. Essa pasta não precisa ser enviada ao GitHub, pois pode ser reproduzida a partir dos fontes e do lockfile.

### Conferência desta entrega

- Migration e seed exercitados em motor PostgreSQL embarcado para teste, sem adicioná-lo às dependências da aplicação.
- Cenários HTTP de autenticação, transações, CRUD, isolamento entre usuários, relatórios, centavos e faturas passaram nesse motor.
- Os quatro exemplos de fechamento do enunciado e uma compra de 48 parcelas foram conferidos.
- Na versão atual, 22 testes unitários do backend, 8 do frontend e o build de produção passaram.
- Login e cadastro foram inspecionados visualmente; mensagens de campos vazios foram verificadas no navegador. A prévia deste ambiente não alcançou a API de teste. Na instalação local do aluno, autenticação, compra parcelada e distribuição nas faturas foram conferidas. A nova página de saúde financeira ainda precisa de conferência visual local.

Na instalação local, confira: entrar, recarregar mantendo a sessão, criar uma conta, testar e-mail e CPF duplicados, registrar uma compra parcelada, consultar relatórios/faturas, editar e excluir registros, sair e tentar abrir uma rota protegida. Os dados efetivamente persistem no PostgreSQL, não no localStorage.

## Entrega acadêmica

A entrega exige link do repositório e apresentação de **no máximo 10 minutos**, demonstrando código, execução por terminal, cadastro com unicidade, login/token/isolamento, CRUDs, parcelamento e relatórios/faturas. O README documenta a instalação do zero e a lista de rotas. Registre commits das alterações realizadas durante o desenvolvimento.

O desafio opcional de **saúde financeira** foi implementado com três indicadores principais, projeção com gráfico e dicas baseadas em regras do backend. A pontuação depende da avaliação da professora. Esta versão está sujeita à conferência local do fluxo completo.

## Uso de IA

ChatGPT/Codex auxilia na modelagem, criação dos componentes, implementação, testes e documentação. O aluno deve estudar a implementação, registrar suas alterações reais e explicar as partes apresentadas. Foram realizadas pelo aluno a instalação local, preparação do PostgreSQL e verificações das etapas de autenticação, CRUD e relatórios.


## Saúde financeira — desafio opcional

A tela `/saude-financeira` consome `GET /api/saude-financeira?mes=AAAA-MM`. Sem o parâmetro, usa o mês corrente. A rota exige JWT; a consulta sempre filtra pelo id do token. Não usa API de inteligência artificial, chave externa ou dados de outro usuário. O aviso de que os dados são educativos e não constituem recomendação financeira profissional aparece na própria tela.

### Indicadores

1. **Taxa de sobra do mês:** `(entradas − saídas) ÷ entradas × 100`. Se não houver entradas, retorna `null` e a interface mostra “Sem base”. Pode ser negativa. É uma diferença dos registros do mês, não comprovação de dinheiro poupado.
2. **Comprometimento com cartões:** faturas dos três meses seguintes divididas por três vezes a renda média mensal histórica, em percentual. Sem média de renda, retorna `null`. O denominador e o numerador representam os mesmos três meses.
3. **Parcelas futuras:** soma e quantidade das parcelas de compras em cartão com vencimento após o mês selecionado, incluindo as posteriores aos três meses projetados, com a data da última parcela.

Para essa análise, compras no cartão são alocadas pelo **vencimento calculado da fatura**, e os demais registros pela data do lançamento. Isso difere dos relatórios por data de compra e está explicado nas hipóteses visíveis da tela.

### Base e projeção

A janela histórica contém os três meses civis completos anteriores ao mês selecionado. As médias usam somente os meses dessa janela com algum registro. Se houver menos de três, a tela avisa “Histórico parcial”. Meses sem registros não são afirmados como meses sem renda real. Com nenhum histórico, a média é zero e o cenário usa somente os registros futuros conhecidos.

A média regular de saídas **exclui compras parceladas**. Para cada um dos próximos três meses:

- Entradas estimadas = maior valor entre renda média histórica e entradas já cadastradas para aquele mês.
- Saídas regulares estimadas = maior valor entre média de despesas não parceladas e saídas não parceladas conhecidas do mês.
- Parcelas conhecidas = soma das parcelas no vencimento daquele mês, acrescentada separadamente.
- Variação mensal = entradas estimadas − saídas regulares estimadas − parcelas conhecidas.
- Variação acumulada = soma das variações mensais, **partindo de zero**.

Usar o maior entre média e registros conhecidos é uma hipótese explícita deste exercício, não uma previsão garantida nem uma recomendação. Evita somar duas vezes o mesmo gasto conhecido à média. O gráfico mostra a variação acumulada estimada, sem tratá-la como saldo bancário: o sistema não tem saldo inicial de conta nem baixa de pagamentos. As médias são arredondadas ao centavo; cálculos monetários continuam usando inteiros no servidor.

### Dicas e verificações

As dicas são descritivas e geradas por regras: ausência de entradas, diferença positiva/negativa no mês, existência de parcelas futuras, histórico parcial e cenário com variação acumulada negativa. Valores e datas do texto vêm dos próprios cálculos. Não há notas de crédito, recomendações de investimento ou promessa de resultado.

Seus dados de demonstração incluem o mês atual e os dois anteriores, portanto é esperado que a análise do mês atual encontre apenas dois meses completos de histórico. Isso é informado na página.

Para atualizar da etapa anterior, preserve `.env`, `.git` e banco. Atualize os arquivos e reinicie backend e frontend. Em um terceiro terminal dentro de `backend`, execute:

```cmd
npm run health:check
```

Oito resultados `OK` são esperados. O comando apenas lê dados. A integração foi exercitada em motor PostgreSQL embarcado: não mistura usuários, rejeita mês inválido e exige token. Seis testes unitários novos cobrem indicadores, centavos, falta de registros, ausência de dupla contagem, cenário negativo e virada do ano. Não há nova migration.
