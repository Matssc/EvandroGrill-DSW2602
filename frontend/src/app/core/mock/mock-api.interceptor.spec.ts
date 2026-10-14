import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, gastosDoResumo, mensagemDeErro, resumirMes } from '../api/api.service';
import { maisVendidosDe } from '../regras/vendas';
import { authInterceptor } from '../auth/auth.interceptor';
import {
  Categoria,
  Compra,
  ComprasResumo,
  Configuracao,
  FechamentoDiario,
  MovimentoReserva,
  Venda,
} from '../models';
import { apiFalsaInterceptor, reiniciarApiFalsa, responder } from './mock-api.interceptor';

// Testa a API falsa direto, sem HttpClient: monta o pedido e confere a resposta.
function pedido(
  metodo: string,
  caminho: string,
  opcoes: { corpo?: unknown; params?: Record<string, string>; token?: string } = {},
) {
  const headers = new HttpHeaders(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {});
  const params = new HttpParams({ fromObject: opcoes.params ?? {} });
  return new HttpRequest(metodo, `/api${caminho}`, opcoes.corpo ?? null, { headers, params });
}

const TOKEN = 'mock-token-1';
const corpo = <T>(resposta: { body?: unknown }) => resposta.body as T;
const get = <T>(caminho: string, params?: Record<string, string>, token = TOKEN) =>
  corpo<T>(responder(pedido('GET', caminho, { params, token })));

describe('API falsa (imita o back)', () => {
  beforeEach(() => reiniciarApiFalsa());

  it('entra com o usuário de exemplo e recusa senha errada', () => {
    const certo = responder(
      pedido('POST', '/auth/login', {
        corpo: { email: 'evandro@evandrosgrill.com.br', senha: 'grill123' },
      }),
    );
    expect(certo.status).toBe(200);
    expect(certo.body).toMatchObject({ token: TOKEN, usuario: { nome: 'Evandro' } });

    const errado = responder(
      pedido('POST', '/auth/login', {
        corpo: { email: 'evandro@evandrosgrill.com.br', senha: 'x' },
      }),
    );
    expect(errado.status).toBe(401);
    expect(errado.body).toMatchObject({ mensagem: 'E-mail ou senha incorretos' });
  });

  it('exige login fora das rotas públicas (RN10)', () => {
    expect(responder(pedido('GET', '/vendas', { params: { data: '2026-10-08' } }))).toEqual({
      status: 401,
      body: null,
    });
    expect(responder(pedido('GET', '/publico/cardapio')).status).toBe(200);
  });

  it('responde no formato do back', () => {
    const vendas = get<Venda[]>('/vendas', { data: '2026-10-08' });
    expect(vendas).toHaveLength(8);
    expect(vendas[0]).toEqual({
      id: 38,
      data: '2026-10-08',
      hora: '21:15:00',
      tipoLancamento: 'POR_VENDA',
      origem: 'Mesa 8',
      formaPagamento: 'CREDITO',
      valor: 404,
      fechada: false,
      itens: [
        {
          produtoId: 1,
          produtoNome: 'Espeto de Picanha',
          quantidade: 12,
          precoUnitario: 18,
          subtotal: 216,
        },
        {
          produtoId: 3,
          produtoNome: 'Frango com Bacon',
          quantidade: 8,
          precoUnitario: 13,
          subtotal: 104,
        },
        {
          produtoId: 4,
          produtoNome: 'Linguiça Toscana',
          quantidade: 4,
          precoUnitario: 11,
          subtotal: 44,
        },
        {
          produtoId: 8,
          produtoNome: 'Pão de Alho',
          quantidade: 4,
          precoUnitario: 10,
          subtotal: 40,
        },
      ],
    });

    const invalida = responder(
      pedido('POST', '/vendas', { corpo: { tipoLancamento: 'POR_VENDA', valor: 0 }, token: TOKEN }),
    );
    expect(invalida.status).toBe(400);
    expect(invalida.body).toMatchObject({
      status: 400,
      mensagem: 'Dados inválidos',
      detalhes: ['valor: O valor deve ser maior que zero'],
    });

    // rota que o back não tem: 404 sem "mensagem", igual ao Spring
    expect(responder(pedido('GET', '/resumo-mensal', { token: TOKEN })).status).toBe(404);
  });

  it('bate com os números do protótipo', () => {
    const resumo = (mes: string) =>
      resumirMes(
        mes,
        get<FechamentoDiario[]>('/fechamentos', { mes }),
        get<ComprasResumo>('/compras/resumo', { mes }),
      );
    expect(resumo('2026-10')).toMatchObject({
      diasTrabalhados: 6,
      vendas: 8620,
      retiradas: 2586,
      compras: 3542.1,
      sobrou: 2491.9,
    });
    expect(resumo('2026-09')).toMatchObject({
      diasTrabalhados: 24,
      vendas: 38920,
      retiradas: 11676,
      salario: 5838,
      compras: 21430,
      sobrou: 5814,
    });

    const movimentos = get<MovimentoReserva[]>('/reserva/movimentos');
    expect(movimentos[0].saldoApos).toBe(5931);

    expect(gastosDoResumo(get<ComprasResumo>('/compras/resumo', { mes: '2026-10' }))).toEqual([
      expect.objectContaining({
        forma: 'PJ Compras',
        formaPagamento: 'CARTAO',
        qtdCompras: 3,
        total: 2184.3,
      }),
      expect.objectContaining({
        forma: 'PJ Contas',
        formaPagamento: 'CARTAO',
        qtdCompras: 1,
        total: 742.8,
      }),
      expect.objectContaining({
        forma: 'À vista',
        formaPagamento: 'A_VISTA',
        qtdCompras: 3,
        total: 615,
      }),
    ]);
  });

  it('fecha o dia, manda metade da retirada pra reserva e trava as vendas (RN02 a RN05)', () => {
    const fechamento = responder(
      pedido('POST', '/fechamentos', { corpo: { data: '2026-10-08' }, token: TOKEN }),
    );
    expect(fechamento.status).toBe(201);
    expect(fechamento.body).toMatchObject({
      totalVendido: 1480,
      valorRetirada: 444,
      valorSalario: 222,
      valorReserva: 222,
    });

    const [entrada] = get<MovimentoReserva[]>('/reserva/movimentos');
    expect(entrada).toMatchObject({
      tipo: 'ENTRADA',
      valor: 222,
      saldoApos: 6153,
      fechamentoDiarioId: corpo<FechamentoDiario>(fechamento).id,
      descricao: 'Fechamento do dia 08/10 · 50% da retirada',
    });

    const denovo = responder(
      pedido('POST', '/fechamentos', { corpo: { data: '2026-10-08' }, token: TOKEN }),
    );
    expect(denovo).toMatchObject({
      status: 400,
      body: { mensagem: 'O dia 08/10/2026 já foi fechado' },
    });

    const novaVenda = {
      data: '2026-10-08',
      hora: '22:00',
      tipoLancamento: 'POR_VENDA',
      origem: 'Balcão',
      formaPagamento: 'PIX',
      valor: 30,
    };
    const depois = responder(pedido('POST', '/vendas', { corpo: novaVenda, token: TOKEN }));
    expect(depois).toMatchObject({
      status: 400,
      body: { mensagem: 'O dia 08/10/2026 já foi fechado e não aceita vendas' },
    });
    expect(get<Venda[]>('/vendas', { data: '2026-10-08' }).every((v) => v.fechada)).toBe(true);
  });

  it('valida a compra: no cartão pede o cartão, à vista não aceita cartão (RN06, RN07)', () => {
    const base = {
      data: '2026-10-08',
      descricao: 'Hortifruti – feira',
      valor: 186.4,
      categoriaId: 1,
      meioAVista: null,
    };
    const semCartao = responder(
      pedido('POST', '/compras', {
        corpo: { ...base, formaPagamento: 'CARTAO', cartaoPjId: null },
        token: TOKEN,
      }),
    );
    expect(semCartao).toMatchObject({
      status: 400,
      body: { mensagem: 'Informe o cartão PJ usado na compra' },
    });

    const certa = responder(
      pedido('POST', '/compras', {
        corpo: { ...base, formaPagamento: 'CARTAO', cartaoPjId: 1 },
        token: TOKEN,
      }),
    );
    expect(certa.status).toBe(201);
    expect(corpo<Compra & { categoriaNome: string }>(certa)).toMatchObject({
      formaPagamento: 'CARTAO',
      categoriaNome: 'Carnes e insumos',
    });

    const aVistaComCartao = responder(
      pedido('POST', '/compras', {
        corpo: { ...base, formaPagamento: 'A_VISTA', cartaoPjId: 1 },
        token: TOKEN,
      }),
    );
    expect(aVistaComCartao).toMatchObject({
      status: 400,
      body: { mensagem: 'Compra à vista não usa cartão PJ' },
    });
  });

  it('mostra a configuração e as categorias e recusa token de quem não existe (RN10)', () => {
    expect(get<Configuracao>('/configuracao')).toMatchObject({
      percentualRetirada: 30,
      dividirRetirada: true,
      metaReserva: 10000,
    });
    expect(get<Categoria[]>('/categorias', { tipo: 'COMPRA' }).map((c) => c.nome)).toEqual([
      'Bebidas',
      'Carnes e insumos',
      'Contas',
      'Descartáveis',
      'Manutenção',
    ]);
    expect(responder(pedido('GET', '/configuracao', { token: 'mock-token-99' }))).toEqual({
      status: 401,
      body: null,
    });
  });
});

describe('Itens da venda', () => {
  beforeEach(() => reiniciarApiFalsa());

  it('no "Por venda" o valor é a soma dos produtos e precisa de pelo menos um', () => {
    const base = {
      data: '2026-10-08',
      hora: '22:00',
      tipoLancamento: 'POR_VENDA',
      origem: 'Mesa 1',
      formaPagamento: 'PIX',
    };
    const semItens = responder(
      pedido('POST', '/vendas', { corpo: { ...base, valor: null, itens: [] }, token: TOKEN }),
    );
    expect(semItens).toMatchObject({
      status: 400,
      body: { mensagem: 'Escolha pelo menos um produto da venda' },
    });

    // valor errado de propósito: quem manda é a soma (2 picanhas + 1 pão de alho, com a picanha repetida)
    const itens = [
      { produtoId: 1, quantidade: 1 },
      { produtoId: 8, quantidade: 1 },
      { produtoId: 1, quantidade: 1 },
    ];
    const certa = responder(
      pedido('POST', '/vendas', { corpo: { ...base, valor: 1, itens }, token: TOKEN }),
    );
    expect(certa.status).toBe(201);
    expect(corpo<Venda>(certa)).toMatchObject({
      valor: 46,
      itens: [
        { produtoId: 1, quantidade: 2, subtotal: 36 },
        { produtoId: 8, quantidade: 1, subtotal: 10 },
      ],
    });
  });

  it('no "Total do dia" vale o total digitado e os produtos são opcionais', () => {
    const base = {
      data: '2026-10-07',
      hora: null,
      tipoLancamento: 'TOTAL_DIA',
      origem: null,
      formaPagamento: null,
    };
    // 07/10 já foi fechado no exemplo; usa um dia aberto
    const aberto = { ...base, data: '2026-10-05' };
    expect(
      responder(
        pedido('POST', '/vendas', { corpo: { ...aberto, valor: null, itens: [] }, token: TOKEN }),
      ),
    ).toMatchObject({
      status: 400,
      body: { mensagem: 'Informe o total vendido no dia' },
    });
    const comItens = responder(
      pedido('POST', '/vendas', {
        corpo: { ...aberto, valor: 500, itens: [{ produtoId: 2, quantidade: 3 }] },
        token: TOKEN,
      }),
    );
    expect(corpo<Venda>(comItens)).toMatchObject({
      valor: 500,
      hora: null,
      itens: [{ produtoId: 2, quantidade: 3 }],
    });
  });

  it('monta o ranking do dia e do mês, e não deixa excluir produto que já foi vendido', () => {
    const dia = get<{ nome: string; quantidade: number }[]>('/vendas/mais-vendidos', {
      inicio: '2026-10-08',
      fim: '2026-10-08',
    });
    expect(dia[0]).toMatchObject({ nome: 'Espeto de Picanha', quantidade: 46 });
    expect(maisVendidosDe(get<Venda[]>('/vendas', { data: '2026-10-08' }))[0]).toMatchObject({
      quantidade: 46,
      total: 828,
    });

    const mes = get<unknown[]>('/vendas/mais-vendidos', {
      inicio: '2026-10-01',
      fim: '2026-10-31',
    });
    expect(mes.length).toBeGreaterThan(5);

    expect(responder(pedido('DELETE', '/produtos/1', { token: TOKEN }))).toMatchObject({
      status: 400,
      body: { mensagem: expect.stringContaining('já aparece em vendas') },
    });
  });
});

const SESSAO_DO_EVANDRO = {
  token: TOKEN,
  usuario: {
    id: 1,
    nome: 'Evandro',
    nomeNegocio: "Evandro's Grill",
    email: 'evandro@evandrosgrill.com.br',
  },
};

describe('ApiService', () => {
  beforeEach(() => {
    reiniciarApiFalsa();
    localStorage.setItem('grill.sessao', JSON.stringify(SESSAO_DO_EVANDRO));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, apiFalsaInterceptor])),
      ],
    });
  });
  afterEach(() => localStorage.clear());

  it('monta o resumo do mês, a reserva, o gasto por cartão e o cardápio do site', async () => {
    const api = TestBed.inject(ApiService);
    expect(await firstValueFrom(api.resumoMensal('2026-10'))).toMatchObject({
      diasTrabalhados: 6,
      vendas: 8620,
      sobrou: 2491.9,
    });
    expect((await firstValueFrom(api.reserva())).saldo).toBe(5931);
    expect((await firstValueFrom(api.gastosPorCartao('2026-10'))).map((g) => g.forma)).toEqual([
      'PJ Compras',
      'PJ Contas',
      'À vista',
    ]);

    const site = await firstValueFrom(api.produtosDoSite());
    expect(site).toHaveLength(7); // a Kafta está com "No site" desligado
    expect(site.slice(0, 2).map((p) => p.nome)).toEqual(['Espeto de Picanha', 'Frango com Bacon']); // destaques primeiro
  });

  it('manda só os campos que o back espera', async () => {
    const api = TestBed.inject(ApiService);
    const comExtras = {
      data: '2026-10-08',
      hora: null,
      tipoLancamento: 'TOTAL_DIA' as const,
      origem: null,
      formaPagamento: null,
      valor: 50,
      itens: [{ produtoId: 2, quantidade: 1, produtoNome: 'sobra', subtotal: 15 }],
      fechada: false,
      id: 99,
    };
    const venda = await firstValueFrom(api.lancarVenda(comExtras));
    expect(venda).toMatchObject({ tipoLancamento: 'TOTAL_DIA', hora: null, valor: 50 });
    expect(venda.itens).toEqual([
      expect.objectContaining({ produtoId: 2, quantidade: 1, produtoNome: 'Espeto de Alcatra' }),
    ]);
    expect(venda.id).not.toBe(99);
  });
});

describe('authInterceptor', () => {
  afterEach(() => localStorage.clear());

  it('não manda o token pras rotas públicas e manda pras do painel', () => {
    localStorage.setItem(
      'grill.sessao',
      JSON.stringify({ ...SESSAO_DO_EVANDRO, token: 'vencido' }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controle = TestBed.inject(HttpTestingController);

    http.get('/api/publico/cardapio').subscribe();
    expect(controle.expectOne('/api/publico/cardapio').request.headers.has('Authorization')).toBe(
      false,
    );
    http.get('/api/vendas').subscribe();
    expect(controle.expectOne('/api/vendas').request.headers.get('Authorization')).toBe(
      'Bearer vencido',
    );
    controle.verify();
  });
});

describe('mensagemDeErro', () => {
  it('mostra o motivo do erro de validação e avisa quando o back não respondeu', () => {
    const validacao = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        mensagem: 'Dados inválidos',
        detalhes: ['valor: O valor deve ser maior que zero'],
      },
    });
    expect(mensagemDeErro(validacao)).toBe('O valor deve ser maior que zero');
    expect(
      mensagemDeErro(
        new HttpErrorResponse({
          status: 400,
          error: { mensagem: 'O dia 08/10/2026 já foi fechado', detalhes: [] },
        }),
      ),
    ).toBe('O dia 08/10/2026 já foi fechado');
    expect(mensagemDeErro(new HttpErrorResponse({ status: 500, error: null }))).toContain(
      'O back não respondeu',
    );
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão');
  });
});
