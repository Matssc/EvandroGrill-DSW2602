import { Route, Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

type Carregar = Route['loadComponent'];

const emConstrucao: Carregar = () =>
  import('./shared/em-construcao/em-construcao').then((m) => m.EmConstrucao);

// Uma tela = uma rota. "figma" é o node-id do frame no protótipo.
// Enquanto a tela não existe, a rota abre o EmConstrucao com o link do frame.
// Quando você criar a tela (passo 12), troque emConstrucao pelo import dela.
function tela(path: string, titulo: string, figma: string, carregar: Carregar = emConstrucao): Route {
  return { path, title: `${titulo} · Evandro's Grill`, data: { titulo, figma }, loadComponent: carregar };
}

export const routes: Routes = [
  // Site público
  {
    ...tela('', 'Espetaria artesanal', '15-1514', () => import('./features/site/home/home').then((m) => m.Home)),
    pathMatch: 'full',
  },

  // Login (RN10)
  tela('admin/login', 'Entrar', '11-1514', () =>
    import('./features/auth/login/login').then((m) => m.Login),
  ),

  // Relatório da contadora: tela cheia, sem a sidebar
  {
    ...tela('admin/fechamento/relatorio', 'Relatório da contadora', '35-2002', () =>
      import('./features/fechamento/relatorio/relatorio').then((m) => m.Relatorio),
    ),
    canActivate: [authGuard],
  },

  // Painel: tudo aqui dentro exige login e usa o layout com a sidebar
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      tela('dashboard', 'Dashboard', '33-1628', () =>
        import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      ),
      tela('vendas', 'Vendas do dia', '33-2022', () =>
        import('./features/vendas/vendas-do-dia/vendas-do-dia').then((m) => m.VendasDoDia),
      ),
      tela('compras', 'Compras', '34-1752', () =>
        import('./features/compras/compras/compras').then((m) => m.Compras),
      ),
      tela('cartoes', 'Cartões PJ', '35-1407', () =>
        import('./features/cartoes/cartoes/cartoes').then((m) => m.Cartoes),
      ),
      tela('pro-labore', 'Pró-labore', '34-963', () =>
        import('./features/pro-labore/pro-labore/pro-labore').then((m) => m.ProLabore),
      ),
      tela('reserva', 'Reserva', '34-1440', () =>
        import('./features/reserva/reserva/reserva').then((m) => m.Reserva),
      ),
      tela('fechamento', 'Fechamento do mês', '35-1655', () =>
        import('./features/fechamento/fechamento/fechamento').then((m) => m.Fechamento),
      ),
      tela('produtos', 'Produtos do site', '36-1638', () =>
        import('./features/produtos/produtos/produtos').then((m) => m.Produtos),
      ),
      tela('configuracoes', 'Configurações', '35-2167', () =>
        import('./features/configuracoes/configuracoes/configuracoes').then((m) => m.Configuracoes),
      ),
    ],
  },

  { path: '**', redirectTo: '' },
];