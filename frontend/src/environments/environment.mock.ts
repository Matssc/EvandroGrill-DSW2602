// npm run start:mock: a API falsa (core/mock) responde tudo, sem precisar do back nem do banco.
// O "hoje" fica em 08/10/2026 pra bater com os dados de outubro do protótipo.
export const environment = {
  production: false,
  apiUrl: '/api',
  useMock: true,
  dataFixa: '2026-10-08' as string | null,
};
