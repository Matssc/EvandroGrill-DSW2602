# DSW2603 · Evandro's Grill

Site da espetaria (landing page com o cardápio) e painel administrativo do Evandro.

Estrutura do projeto:

- `backend/` – Spring Boot 4 (Java 17) com MySQL. O projeto Maven fica em `backend/EvandrosGrill`
- `frontend/` – Angular 21
- `deploy/` – `docker-compose.yaml`, que sobe banco, back e front juntos

## Jeito 1: tudo pelo Docker

Precisa só do Docker Desktop aberto.

```bash
cd deploy
docker compose up --build
```

A primeira vez demora alguns minutos (baixa as imagens e as dependências do Maven e do npm).
Quando aparecer `Started EvandrosgrillApplication` no log:

- Site: http://localhost:4200
- Painel: http://localhost:4200/admin/login, com `evandro@evandrosgrill.com.br` e senha `grill123`
- API: http://localhost:8080/api
- Banco no Workbench: `localhost`, porta `3307`, usuário `root`, senha `grill123`

Pra usar outras portas (por exemplo, as que você liberou no firewall da nuvem), crie o arquivo `deploy/.env`
com `PORTA_SITE=5898` (site e painel, padrão 4200) e `PORTA_API=8087` (API, padrão 8080) e suba de novo.
O site chama a API pela própria porta dele, então só `PORTA_SITE` precisa estar liberada pra acessar de fora.

Pra parar: `Ctrl+C` (ou `docker compose down`). Os dados ficam no volume `dados-mysql`;
pra começar do zero, `docker compose down -v`. Mudou o código? Rode `docker compose up --build` de novo.

## Jeito 2: desenvolvendo (back e front rodando direto no PC)

Precisa de Java 17 ou mais novo, Node 22 ou mais novo e um MySQL.

1. **Banco.** Use o MySQL que você já tem (porta 3306) ou suba só o banco do Docker:
   `cd deploy` e `docker compose up -d db` (porta 3307, senha `grill123`).
2. **Back.** Crie (ou confira) o `backend/EvandrosGrill/src/main/resources/application-local.properties`.
   Ele não vai pro Git, cada um tem o seu:

   ```properties
   # Senha do root do seu MySQL (vazia no XAMPP)
   spring.datasource.password=
   # Só se o banco não for o localhost:3306, por exemplo o do Docker:
   # spring.datasource.url=jdbc:mysql://localhost:3307/evandros_grill?createDatabaseIfNotExist=true&sslMode=DISABLED&allowPublicKeyRetrieval=true

   # Segredo que assina os tokens: uma frase com pelo menos 32 caracteres
   app.jwt.secret=troque-esta-frase-por-uma-sua-com-mais-de-32-caracteres

   # Usuário do Evandro, criado na primeira subida (com o banco vazio)
   app.admin.email=evandro@evandrosgrill.com.br
   app.admin.senha=grill123
   ```

   Rode a classe `EvandrosgrillApplication` no IntelliJ, ou pelo terminal:
   `cd backend/EvandrosGrill` e `mvnw.cmd spring-boot:run` (no Linux/Mac, `./mvnw spring-boot:run`).
   As tabelas são criadas sozinhas (`ddl-auto=update`) e o back fica na porta 8080.
3. **Front.** `cd frontend`, `npm install` (só na primeira vez) e `npm start`. Abre em http://localhost:4200;
   o `proxy.conf.json` repassa o `/api` pro back na 8080.

Sem o back rodando, `npm run start:mock` abre o front com a API falsa (os dados de outubro do protótipo).

### Sem Docker e sem MySQL (computador da faculdade)

O back também roda com o H2, um banco que fica num arquivo e não precisa instalar nada. No
`application-local.properties` desse computador, troque as linhas do banco por estas:

```properties
spring.datasource.url=jdbc:h2:file:~/evandros-grill/banco
spring.datasource.username=sa
spring.datasource.password=
```

Os dados ficam em `C:\Users\<seu usuário>\evandros-grill`. Pra começar do zero, apague essa pasta com o back parado.
Pra voltar pro MySQL, é só tirar essas três linhas.

## API

Tudo em `/api`, JSON em camelCase, datas `2026-10-08` e meses `2026-10`. Fora o login e o cardápio,
toda rota pede o cabeçalho `Authorization: Bearer <token>` e só mostra os dados do dono do token (RN10).
Erro vem como `{ "status", "mensagem", "detalhes", "timestamp" }`.

| Rota | O que faz |
| --- | --- |
| `POST /auth/login` | Entrar; devolve `{ token, usuario }`. O usuário do Evandro é criado na primeira subida do back |
| `GET /publico/cardapio` | Cardápio da landing page (sem login) |
| `GET /usuario/me`, `PUT /usuario/senha` | Dados de quem entrou e troca de senha |
| `GET` e `PUT /configuracao` | Percentual de retirada, divisão salário/reserva e meta (RN02 a RN04) |
| `GET /vendas?data=`, `GET /vendas/resumo?data=`, `POST /vendas`, `PUT` e `DELETE /vendas/{id}` | Vendas do dia (RN01) |
| `GET /vendas/mais-vendidos?inicio=&fim=` | Produtos que mais saíram no período (quantidade e valor), pelos itens das vendas |
| `GET /fechamentos?mes=`, `GET /fechamentos/previa?data=`, `GET /fechamentos/dia?data=`, `POST /fechamentos` | Fechamento do dia e dias trabalhados (RN02, RN03, RN05) |
| `GET /reserva/movimentos?tipo=`, `GET /reserva/resumo?mes=`, `POST /reserva/movimentos`, `DELETE /reserva/movimentos/{id}` | Reserva da empresa (RN04) |
| `GET /compras?mes=`, `GET /compras/resumo?mes=`, `POST /compras`, `GET`, `PUT` e `DELETE /compras/{id}` | Compras e gasto por cartão no mês (RN06 a RN08) |
| `GET /cartoes`, `POST /cartoes`, `GET`, `PUT` e `DELETE /cartoes/{id}` | Cartões PJ (RN07) |
| `GET /categorias?tipo=`, `POST /categorias`, `PUT` e `DELETE /categorias/{id}` | Categorias de compra e de produto |
| `GET /produtos`, `GET /produtos/resumo`, `POST /produtos`, `GET`, `PUT` e `DELETE /produtos/{id}`, `PATCH /produtos/{id}/no-site?valor=` | Produtos do site |

O fechamento do mês (RN08) e o relatório da contadora (RN09) são montados no front com
`/fechamentos?mes=` e `/compras/resumo?mes=`.

Os itens de cada venda ficam na tabela `venda_item` (produto, quantidade e o preço do produto no
momento da venda). No "Por venda" os itens são obrigatórios e o back calcula o valor somando
quantidade × preço; no "Total do dia" o valor é digitado e os itens são opcionais.

## Deploy automático no Azure

O workflow `.github/workflows/deploy.yml` atualiza a VM a cada push na `main` (ele faz `git pull` e
`docker compose up --build -d` por SSH). Antes de funcionar, crie três segredos no GitHub, em
Settings > Secrets and variables > Actions: `VM_HOST` (IP da VM), `VM_USER` (`azureuser`) e
`VM_SSH_KEY` (o conteúdo do arquivo `.pem`). A VM precisa ter o projeto clonado em
`~/EvandroGrill-DSW2602` e a porta 22 liberada. Dá pra rodar na mão na aba Actions (Run workflow).
