// npm start (ng serve): conversa com o back de verdade na porta 8080, pelo proxy.conf.json.
// Pra mexer no front sem o back rodando, use `npm run start:mock` (environment.mock.ts).
export const environment = {
  production: false,
  apiUrl: '/api',
  useMock: false,
  dataFixa: null as string | null,
};
