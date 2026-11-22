# MinhasContas — controle financeiro pessoal

Aplicação fullstack para organizar receitas, despesas, contas e compras parceladas, desenvolvida para o Projeto 2 da disciplina **Programação Web Fullstack**.

## Integrante

- **Pedro Augusto da Silva Morais — RA 2565935**

Projeto desenvolvido para apresentação individual.

## Vídeo de apresentação

- [Assistir no YouTube](https://youtu.be/GkzULDpjvC8)
- [Assistir no Google Drive](https://drive.google.com/file/d/1P-fPwluc1YJKVVQ1P7tpXCFhvhusb8Xb/view?usp=drive_link)

## Tecnologias e requisitos

| Requisito | Implementação |
| --- | --- |
| React.js | Componentes funcionais e interface reativa |
| SPA | Navegação entre telas com React Router, sem recarregar o documento inteiro |
| Backend | API REST própria com Node.js e Express |
| Banco de dados | PostgreSQL, acessado pelo driver `pg` |
| Comunicação | Requisições com `fetch` e respostas em JSON |
| Autenticação | JWT com expiração e senhas protegidas com bcrypt |
| Gerenciamento de estado | Context API, useContext, useState e useEffect |
| Gráficos | Recharts |
| Interface | CSS próprio e layout responsivo |
| Integração funcional | Cadastro → login → movimentações → parcelamento → relatórios e faturas |
| Funcionalidade adicional | Indicadores e projeção educativa de saúde financeira |
| Ferramentas de apoio | Uso de IA documentado ao final deste README |

O backend verifica a autenticação e restringe cada usuário aos próprios dados. Os registros financeiros são persistidos no PostgreSQL.

## Funcionalidades

- Cadastro com nome, e-mail, CPF, senha e confirmação.
- Validação dos dígitos verificadores do CPF.
- Bloqueio de e-mail e CPF duplicados.
- Login com autenticação JWT e opção de conta de demonstração.
- Rotas protegidas e encerramento da sessão no frontend.
- Visão geral com resumo mensal, gráfico e últimos lançamentos.
- Cadastro, consulta, edição e exclusão de categorias.
- Gerenciamento de fontes de renda, contas e cartões de crédito.
- Configuração de limite, fechamento e vencimento dos cartões.
- Cadastro, consulta, edição e exclusão de entradas e saídas.
- Filtros por período, tipo, categoria e fonte/destino.
- Paginação com totais referentes ao filtro completo.
- Compras no cartão com parcelamento entre 1 e 48 vezes.
- Edição de uma parcela e exclusão individual ou da compra inteira.
- Relatórios por categoria e por fonte/destino.
- Percentuais e comparação com o período anterior.
- Consulta da fatura aberta e das três seguintes.
- Cálculo do limite comprometido e disponível.
- Indicadores, projeção e orientações educativas de saúde financeira.
- Estados de carregamento, erro, lista vazia e confirmação de exclusão.

## Como executar

### Pré-requisitos

- Node.js **22.12 ou superior**, com npm instalado.
- PostgreSQL **16 ou superior**, instalado e em execução.
- Conexão com a internet para instalar as dependências.
- Opcional: pgAdmin para criar e consultar o banco.

### 1. Baixar o projeto

Clone o repositório:

```bash
git clone https://github.com/PedroAugustoMorais/Projeto2React_PedroAugusto_FullStack.git
```

Entre na pasta:

```bash
cd Projeto2React_PedroAugusto_FullStack
```

Também é possível selecionar **Code → Download ZIP** no GitHub e extrair o arquivo.

Abra a pasta raiz no VS Code.

### 2. Criar o banco

No pgAdmin, conectado ao servidor PostgreSQL, selecione **Databases → Create → Database** e crie:

```text
projeto2_financas
```

Alternativamente, conectado ao banco `postgres`, execute fora de uma transação:

```sql
CREATE DATABASE projeto2_financas;
```

### 3. Configurar o backend

No terminal, entre em `backend` e instale as dependências:

```bash
cd backend
npm ci
```

Copie `.env.example` para `.env`.

No Windows, usando CMD:

```cmd
copy .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No macOS ou Linux:

```bash
cp .env.example .env
```

Edite `backend/.env` com as configurações locais:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/projeto2_financas
JWT_SECRET=COLE_UM_SEGREDO_ALEATORIO_AQUI
FRONTEND_ORIGIN=http://localhost:5173
```

Substitua `SUA_SENHA` pela senha do PostgreSQL. Se utilizar outro usuário, ajuste também o nome `postgres`.

Caracteres reservados na senha, como `@`, `#` e `%`, precisam de codificação de URL.

Para gerar o segredo do JWT, execute:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copie o resultado para `JWT_SECRET`.

O `.env` contém configurações particulares e não deve ser enviado ao GitHub. O `.env.example` permanece no repositório como referência.

### 4. Criar as tabelas e carregar a demonstração

Ainda na pasta `backend`, execute:

```bash
npm run db:migrate
npm run db:seed
npm run db:check
```

Em um banco vazio, a carga inicial cria:

- 2 usuários;
- 18 categorias;
- 6 fontes/destinos;
- 48 lançamentos distribuídos em três meses.

Os meses correspondem ao mês da execução e aos dois anteriores. O seed preserva usuários já existentes com o mesmo e-mail ou CPF.

### 5. Iniciar o backend

```bash
npm run dev
```

Mantenha esse terminal aberto.

Para conferir se a API está disponível, acesse:

http://localhost:3000/health

Resposta esperada:

```json
{
  "status": "ok"
}
```

### 6. Iniciar o frontend

Abra outro terminal na raiz do projeto:

```bash
cd frontend
npm ci
npm run dev
```

Abra o endereço **Local** informado pelo Vite, normalmente:

http://localhost:5173

Mantenha os dois servidores em execução. Para encerrar cada um, pressione **Ctrl + C** no terminal correspondente.

O frontend encaminha as chamadas `/api` para o backend pelo proxy do Vite. Na configuração padrão, não é necessário criar um `.env` no frontend.

Para acessar pelo endereço Network, ajuste `FRONTEND_ORIGIN` no backend para a origem utilizada no navegador.

## Contas de demonstração

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana Demonstração | ana@example.com | Demo12345 |
| Bruno Demonstração | bruno@example.com | Demo12345 |

O botão **Usar conta de demonstração** autentica a conta da Ana pelo mesmo endpoint utilizado no login comum.

Essas credenciais são públicas e destinadas à demonstração local. Utilize dados fictícios nos testes. Os CPFs da carga inicial são exemplos com dígitos verificadores válidos, sem consulta ou confirmação de identidade.

## API REST utilizada

A aplicação utiliza uma **API própria**, desenvolvida com Node.js e Express.

Endereço padrão:

```text
http://localhost:3000/api
```

O frontend envia requisições HTTP com `fetch`, e a API consulta o PostgreSQL e retorna dados em JSON.

| Método | Rota | Funcionalidade |
| --- | --- | --- |
| POST | `/api/auth/cadastro` | Cadastrar usuário |
| POST | `/api/auth/login` | Autenticar e receber JWT |
| GET | `/api/auth/me` | Consultar usuário autenticado |
| GET / POST | `/api/categorias` | Listar e criar categorias |
| GET / PUT / DELETE | `/api/categorias/:id` | Consultar, editar e excluir categoria |
| GET / POST | `/api/fontes-destinos` | Listar e criar fontes/destinos |
| GET / PUT / DELETE | `/api/fontes-destinos/:id` | Consultar, editar e excluir fonte/destino |
| GET / POST | `/api/lancamentos` | Listar e criar lançamentos |
| GET / PUT / DELETE | `/api/lancamentos/:id` | Consultar, editar e excluir lançamento |
| GET | `/api/relatorios/categorias` | Totais, percentuais e comparação anterior |
| GET | `/api/relatorios/fontes-destinos` | Movimentações e saldo das contas |
| GET | `/api/faturas` | Faturas e limites dos cartões |
| GET | `/api/saude-financeira` | Indicadores e projeção financeira |

As rotas financeiras exigem o cabeçalho:

```http
Authorization: Bearer TOKEN
```

Cadastro e login são públicos. A rota de diagnóstico `/health` também é pública e fica fora de `/api`.

Os principais códigos de resposta são:

| Código | Significado |
| --- | --- |
| 200 | Consulta ou edição concluída |
| 201 | Registro criado |
| 204 | Exclusão concluída |
| 400 | Dados inválidos |
| 401 | Autenticação ausente ou inválida |
| 404 | Registro não encontrado ou inacessível ao usuário |
| 409 | Duplicidade ou vínculo que impede a operação |
| 429 | Limite de tentativas atingido |

## Hooks e gerenciamento da sessão

O `AuthContext` compartilha as informações de autenticação entre os componentes.

| Recurso | Papel no projeto |
| --- | --- |
| useState | Mantém estados como usuário, token e inicialização da sessão |
| useEffect | Verifica a sessão existente, acompanha a expiração e limpa operações pendentes |
| useContext | Permite consumir o contexto de autenticação nos componentes |
| Context API | Disponibiliza usuário e funções como login, logout e cadastro |
| React Router | Organiza a navegação e as rotas protegidas da interface |

O token fica no `sessionStorage`. Ao recarregar a aplicação, a identidade é verificada por `/api/auth/me`.

O serviço `frontend/src/services/api.js` centraliza o `fetch`, inclui o token e trata os erros. Respostas `401` em operações protegidas encerram a sessão no frontend.

O logout remove o token do navegador. Não existe revogação antecipada no servidor: um token copiado permanece válido até sua expiração de uma hora.

## Banco de dados e segurança

| Tabela | Dados principais |
| --- | --- |
| usuarios | Nome, e-mail, CPF e hash da senha |
| categorias | Nome, tipo e usuário proprietário |
| fontes_destinos | Contas, rendas e cartões pertencentes ao usuário |
| lancamentos | Entradas, saídas, valores, datas e identificação das parcelas |

- E-mail e CPF possuem restrições `UNIQUE` no banco.
- Senhas são armazenadas com bcrypt, salt automático e custo 12.
- O JWT tem assinatura, expiração, emissor e destinatário verificados.
- A identidade utilizada nas consultas vem do token.
- Consultas filtram os registros pelo usuário autenticado.
- Consultar, editar ou excluir um registro de outro usuário retorna `404`.
- As consultas SQL são parametrizadas.
- Chaves estrangeiras protegem os relacionamentos e a propriedade dos dados.
- Cadastros com lançamentos vinculados possuem proteção contra exclusão.
- Erros não devolvem senha, hash ou detalhes internos do banco.
- Há limites de tentativas para cadastro e login.

## Regras de lançamentos, parcelas e faturas

- Valores são positivos; o tipo define entrada ou saída.
- Contas aceitam entradas e saídas.
- Fontes de renda aceitam entradas.
- Cartões de crédito aceitam saídas.
- Parcelamento é permitido somente em cartão de crédito, entre 1 e 48 parcelas.
- Na criação de uma compra, o valor informado representa o total.
- A divisão utiliza centavos inteiros para preservar a soma.
- Exemplo: **R$ 100,00 em 3 parcelas = R$ 33,34 + R$ 33,33 + R$ 33,33**.
- Todas as parcelas da compra são inseridas na mesma transação.
- Cada parcela mantém a data original da compra.
- A edição altera somente a parcela selecionada.
- A exclusão permite remover uma parcela ou todos os registros ainda existentes da compra.
- Relatórios agrupam os lançamentos pela data da compra; as faturas apresentam a distribuição por vencimento.
- Compras anteriores ao fechamento entram no ciclo que fecha naquele mês.
- Compras no dia do fechamento ou depois entram no próximo ciclo.
- Dias inexistentes são ajustados ao último dia do mês.
- O limite comprometido considera todas as parcelas ainda não vencidas, inclusive além das quatro faturas exibidas.

Não há integração bancária, pagamento de faturas ou confirmação de quitação. Os valores apresentados são calculados a partir dos registros cadastrados.

## Saúde financeira

A funcionalidade adicional apresenta:

- Taxa de sobra do mês.
- Comprometimento com cartões nos três meses seguintes.
- Total e quantidade de parcelas futuras.
- Projeção dos próximos três meses.
- Gráfico da variação acumulada estimada.
- Orientações educativas baseadas em regras.

A análise considera os três meses completos anteriores ao mês selecionado. Quando há menos histórico, a interface informa essa limitação.

Compras no cartão são consideradas pelo vencimento calculado; os demais lançamentos, pela data registrada. As parcelas são acrescentadas separadamente à projeção para evitar dupla contagem.

O acumulado projetado começa em zero e **não representa saldo bancário real**. Os resultados são educativos, sem recomendação financeira profissional, API de IA ou promessa de resultado.

## Estrutura

```text
backend/
  database/                 SQL, migração, carga inicial e verificações
  src/
    server.js               inicialização do servidor
    config/                 configurações, validações e funções de cálculo
    routes/                 endpoints e seus controladores
    models/                 consultas SQL e persistência
    middlewares/            autenticação e tratamento de erros
  tests/                    validações e cenários de integração
frontend/
  src/
    main.jsx                ponto de entrada
    components/             telas, formulários e gráficos
    contexts/               contexto de autenticação
    services/               comunicação com a API
    styles.css              estilos e responsividade
  tests/                    cliente HTTP e formatação
```

## Verificação

Com a API em execução, abra outro terminal em `backend`:

```bash
npm run auth:check
npm run finance:check
npm run reports:check
npm run health:check
```

Os comandos verificam autenticação, isolamento entre usuários, operações financeiras, relatórios, faturas e saúde financeira utilizando as contas de demonstração.

O teste financeiro cria registros temporários e os remove ao concluir.

### Testes do backend

Na pasta `backend`:

```bash
npm test
```

O projeto contém 22 testes unitários. Os cenários HTTP integrados ao PostgreSQL exigem `TEST_DATABASE_URL`; sem essa configuração, o teste integrado aparece como ignorado.

Para executá-lo, crie um banco separado e configure no `.env`:

```env
TEST_DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/projeto2_financas_test
```

O teste cria e remove um schema temporário. Não utilize uma conexão de produção.

### Testes e build do frontend

Na pasta `frontend`:

```bash
npm test
npm run build
```

São 8 testes de cliente HTTP e formatação. O build gera a versão de produção em `frontend/dist`.

As pastas `node_modules` e `dist` não precisam ser enviadas ao GitHub. Os arquivos `package-lock.json` devem permanecer versionados.

## Uso de ferramentas de apoio e IA

**ChatGPT / Codex** 

A instalação local, a configuração do PostgreSQL e as verificações das funcionalidades foram realizadas pelo integrante.

O código foi produzido com auxílio de IA.
