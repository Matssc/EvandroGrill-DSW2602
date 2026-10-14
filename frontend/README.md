# Front do Evandro's Grill

Angular 21 com componentes standalone e signals. Landing page em `/` e painel administrativo em `/admin`.

## Rodar

- `npm install`
- `npm start` abre em http://localhost:4200 e conversa com o back na porta 8080 (o `proxy.conf.json` repassa o `/api`).
  Suba o back antes: o passo a passo está no README da raiz do projeto.
- `npm run start:mock` abre sem precisar do back: a API falsa (`src/app/core/mock`) imita as rotas, o JSON e as
  regras do back, com os dados de outubro do protótipo. Login de teste: `evandro@evandrosgrill.com.br` / `grill123`.
  Recarregar a página volta os dados ao início.
- `npm test` roda os testes (Vitest)
- `npm run build` gera `dist/evandros-grill/browser`

As chamadas ficam todas em `src/app/core/api/api.service.ts`, nas rotas do back. O resumo do mês, o gasto por
cartão e o saldo da reserva são montados ali, juntando as rotas que o back tem.

## Telas

| Rota | Tela |
| --- | --- |
| `/` | Landing page (cardápio vem dos produtos marcados "No site") |
| `/admin/login` | Entrar no painel (RN10) |
| `/admin/dashboard` | Dashboard |
| `/admin/vendas` | Vendas do dia e fechamento do caixa (RN01 a RN03) |
| `/admin/compras` | Compras (RN06, RN07) |
| `/admin/cartoes` | Cartões PJ (RN07) |
| `/admin/pro-labore` | Pró-labore (RN05) |
| `/admin/reserva` | Reserva da empresa (RN04) |
| `/admin/fechamento` | Fechamento do mês (RN08) |
| `/admin/fechamento/relatorio` | Relatório da contadora, em PDF e planilha (RN09) |
| `/admin/produtos` | Produtos do site |
| `/admin/configuracoes` | Configurações (RN02 a RN04) |

## Pastas

- `core/`: modelos, regras do caixa, chamadas da API, login, a API falsa e o contato da espetaria (`contato.ts`)
- `layout/`: a moldura do painel, com a sidebar
- `shared/`: peças usadas por mais de uma tela (o desenho do espeto, o ícone do WhatsApp, o "Em construção")
- `features/`: uma pasta por tela; a landing page fica em `features/site`, um componente por seção

O WhatsApp, o endereço, o horário e o mapa do Google da landing page saem de `src/app/core/contato.ts`
(os dados são os do perfil da espetaria no Google).

## Docker

O `Dockerfile` compila o Angular e serve com nginx na porta 80. O `deploy/docker-compose.yaml` publica na 4200,
e o nginx repassa o `/api` pro serviço `backend`.
