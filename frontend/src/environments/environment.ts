// Build de produção (Docker). A API é o back de verdade, atrás do nginx.
export const environment = {
    production: true,
    apiUrl: '/api',
    useMock: false,
    dataFixa: null as string | null,
  };