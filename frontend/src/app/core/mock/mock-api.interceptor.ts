import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { hoje, horaAgora } from '../datas';
import {
  Compra,
  ComprasResumo,
  Configuracao,
  DadosLogin,
  FechamentoDiario,
  MaisVendido,
  MovimentoReserva,
  NovaCompra,
  NovaVenda,
  NovoCartao,
  NovoMovimento,
  NovoProduto,
  Produto,
  ProdutoSite,
  Sessao,
  Venda,
} from '../models';
import { calcularFechamento, somar } from '../regras/caixa';
import {
  Banco,
  CONFIG_PADRAO,
  ConfigNoBanco,
  DoUsuario,
  ItemNoBanco,
  MovimentoNoBanco,
  UsuarioNoBanco,
  VendaNoBanco,
  categoriasPadrao,
  criarBanco,
} from './mock-db';

// API falsa: responde as chamadas /api/... imitando o back de verdade (pasta backend/):
// mesmas rotas, mesmo JSON, mesmas regras e as mesmas mensagens de erro.
// Serve pra mexer no front sem o back rodando: `npm run start:mock`.
// Recarregar a página volta os dados ao início.

const ATRASO_MS = 250; // finge o tempo de rede
const DONO_DO_SITE = 1; // app.usuario-publico-id do back: de quem é o cardápio da landing page

let banco: Banco = criarBanco();

/** Volta os dados ao estado inicial (os testes usam). */
export function reiniciarApiFalsa(): void {
  banco = criarBanco();
}

/** Responde tudo que vai pra /api, sem olhar o environment (os testes usam este). */
export const apiFalsaInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.apiUrl}/`)) {
    return next(req);
  }
  const { status, body } = responder(req);
  if (status >= 400) {
    const erro = new HttpErrorResponse({ status, error: body ?? null, url: req.url });
    return timer(ATRASO_MS).pipe(mergeMap(() => throwError(() => erro)));
  }
  return of(new HttpResponse({ status, body: body ?? null, url: req.url })).pipe(delay(ATRASO_MS));
};

/** O do app.config.ts: só responde quando o environment liga a API falsa (useMock). */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) =>
  environment.useMock ? apiFalsaInterceptor(req, next) : next(req);

// ---------------------------------------------------------------------------
// Roteamento

interface Resposta {
  status: number;
  body?: unknown;
}

interface Pedido {
  usuarioId: number;
  id: number; // o :id da rota
  corpo: any; // o JSON que o front mandou
  param: (nome: string) => string;
}

const rotas: { metodo: string; padrao: RegExp; acao: (p: Pedido) => Resposta; publica: boolean }[] =
  [];

function rota(
  metodo: string,
  caminho: string,
  acao: (p: Pedido) => Resposta,
  publica = false,
): void {
  rotas.push({
    metodo,
    padrao: new RegExp(`^${caminho.replace(':id', '(\\d+)')}$`),
    acao,
    publica,
  });
}

export function responder(req: HttpRequest<unknown>): Resposta {
  const caminho = req.url.slice(environment.apiUrl.length).split('?')[0];
  for (const r of rotas) {
    const achou = r.metodo === req.method ? caminho.match(r.padrao) : null;
    if (!achou) continue;
    const usuarioId = r.publica ? 0 : usuarioDoToken(req.headers.get('Authorization'));
    // Spring Security: sem token válido, 401 sem corpo
    if (usuarioId === null) return { status: 401, body: null };
    return r.acao({
      usuarioId,
      id: Number(achou[1]),
      corpo: req.body ?? {},
      param: (nome) => req.params.get(nome) ?? '',
    });
  }
  // Rota que não existe: o Spring responde 404 com o erro padrão dele, sem "mensagem"
  return {
    status: 404,
    body: { timestamp: agora(), status: 404, error: 'Not Found', path: `/api${caminho}` },
  };
}

function usuarioDoToken(cabecalho: string | null): number | null {
  const id = Number(cabecalho?.match(/^Bearer mock-token-(\d+)$/)?.[1]);
  return banco.usuarios.some((u) => u.id === id) ? id : null;
}

// ---------------------------------------------------------------------------
// Respostas no formato do back (TratadorDeExcecoes): { status, mensagem, detalhes, timestamp }

const ok = (body?: unknown, status = 200): Resposta => ({ status, body });

function erro(status: number, mensagem: string, detalhes: string[] = []): Resposta {
  return { status, body: { status, mensagem, detalhes, timestamp: agora() } };
}
const regra = (mensagem: string) => erro(400, mensagem); // RegraNegocioException
const naoEncontrado = (mensagem: string) => erro(404, mensagem); // RecursoNaoEncontradoException

/** O @Valid do back: cada regra que falhar vira uma linha "campo: mensagem" em detalhes. */
function validar(...regras: [falhou: boolean, detalhe: string][]): Resposta | null {
  const detalhes = regras.filter(([falhou]) => falhou).map(([, detalhe]) => detalhe);
  return detalhes.length ? erro(400, 'Dados inválidos', detalhes) : null;
}

const ausente = (v: unknown) => v === null || v === undefined || v === '';
const vazio = (v: unknown) => typeof v !== 'string' || v.trim() === '';
const longo = (v: unknown, max: number) => typeof v === 'string' && v.length > max;
const futuro = (data: unknown) => typeof data === 'string' && data > hoje();
const naoPositivo = (v: unknown) => typeof v === 'number' && !(v > 0);
const EMAIL = /^[^\s@]+@[^\s@]+$/;
// O MySQL compara texto sem diferenciar maiúsculas (apelido de cartão, código de produto, e-mail)
const mesmoTexto = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// ---------------------------------------------------------------------------
// Utilitários

function semDono<T extends { usuarioId: number }>(linha: T): Omit<T, 'usuarioId'> {
  const { usuarioId: _dono, ...resto } = linha;
  return resto;
}

// RN10: toda consulta passa por aqui, então cada um só enxerga as próprias linhas
function doUsuario<T extends { usuarioId: number }>(linhas: T[], usuarioId: number): T[] {
  return linhas.filter((l) => l.usuarioId === usuarioId);
}

function proximoId(linhas: { id: number }[]): number {
  return Math.max(0, ...linhas.map((l) => l.id)) + 1;
}

function remover<T>(linhas: T[], linha: T): void {
  linhas.splice(linhas.indexOf(linha), 1);
}

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, 'pt-BR');
const diaMes = (data: string) => `${data.slice(8)}/${data.slice(5, 7)}`;
const diaMesAno = (data: string) => `${diaMes(data)}/${data.slice(0, 4)}`;
const comSegundos = (hora: string) => (hora.length === 5 ? `${hora}:00` : hora);

/** Data e hora de agora, como o Relogio do back: '2026-10-08T21:15:00'. */
function agora(): string {
  return `${hoje()}T${horaAgora()}:00`;
}

// ---------------------------------------------------------------------------
// Login (RN10)

function sessao(u: UsuarioNoBanco): Sessao {
  return {
    token: `mock-token-${u.id}`,
    usuario: { id: u.id, nome: u.nome, nomeNegocio: u.nomeNegocio, email: u.email },
  };
}

rota(
  'POST',
  '/auth/login',
  ({ corpo }) => {
    const { email, senha } = corpo as Partial<DadosLogin>;
    const problema = validar(
      [vazio(email), 'email: Informe o e-mail'],
      [!vazio(email) && !EMAIL.test(email!.trim()), 'email: E-mail inválido'],
      [vazio(senha), 'senha: Informe a senha'],
    );
    if (problema) return problema;
    const usuario = banco.usuarios.find(
      (u) => mesmoTexto(u.email, email!.trim()) && u.senha === senha,
    );
    return usuario ? ok(sessao(usuario)) : erro(401, 'E-mail ou senha incorretos');
  },
  true,
);

// ---------------------------------------------------------------------------
// Configurações (RN02, RN03, RN04)

/** ConfiguracaoService.obterOuCriar: quem ainda não tem configuração ganha a padrão. */
function configDe(usuarioId: number): ConfigNoBanco {
  let config = banco.configuracoes.find((c) => c.usuarioId === usuarioId);
  if (!config) {
    config = {
      id: proximoId(banco.configuracoes),
      usuarioId,
      ...CONFIG_PADRAO,
      atualizadoEm: agora(),
    };
    banco.configuracoes.push(config);
  }
  return config;
}

rota('GET', '/configuracao', ({ usuarioId }) => ok(semDono(configDe(usuarioId))));

rota('PUT', '/configuracao', ({ usuarioId, corpo }) => {
  const c = corpo as Partial<Configuracao>;
  const foraDaFaixa = (v: unknown) => typeof v === 'number' && (v < 0 || v > 100);
  const problema = validar(
    [ausente(c.percentualRetirada), 'percentualRetirada: Informe o percentual de retirada'],
    [
      typeof c.percentualRetirada === 'number' && c.percentualRetirada < 0,
      'percentualRetirada: O percentual não pode ser negativo',
    ],
    [
      typeof c.percentualRetirada === 'number' && c.percentualRetirada > 100,
      'percentualRetirada: O percentual não pode passar de 100',
    ],
    [ausente(c.dividirRetirada), 'dividirRetirada: Informe se a retirada será dividida'],
    [ausente(c.percentualSalario), 'percentualSalario: Informe o percentual do salário'],
    [foraDaFaixa(c.percentualSalario), 'percentualSalario: deve estar entre 0 e 100'],
    [ausente(c.percentualReserva), 'percentualReserva: Informe o percentual da reserva'],
    [foraDaFaixa(c.percentualReserva), 'percentualReserva: deve estar entre 0 e 100'],
    [
      typeof c.metaReserva === 'number' && c.metaReserva < 0,
      'metaReserva: A meta não pode ser negativa',
    ],
  );
  if (problema) return problema;

  let percentualSalario = c.percentualSalario!;
  let percentualReserva = c.percentualReserva!;
  if (c.dividirRetirada) {
    // Com a divisão ligada, salário + reserva precisam fechar 100% da retirada
    if (somar([percentualSalario, percentualReserva]) !== 100) {
      return regra('O salário e a reserva precisam somar 100% da retirada');
    }
  } else {
    // Divisão desligada: toda a retirada vira salário
    percentualSalario = 100;
    percentualReserva = 0;
  }

  const config = configDe(usuarioId);
  Object.assign(config, {
    percentualRetirada: c.percentualRetirada,
    dividirRetirada: c.dividirRetirada,
    percentualSalario,
    percentualReserva,
    metaReserva: c.metaReserva ?? null,
    atualizadoEm: agora(),
  });
  return ok(semDono(config));
});

// ---------------------------------------------------------------------------
// Vendas do dia (RN01)

function vendaResponse(v: VendaNoBanco): Venda {
  const { usuarioId: _dono, fechamentoDiarioId, itens, ...resto } = v;
  return {
    ...resto,
    fechada: fechamentoDiarioId !== null,
    itens: itens.map((i) => ({
      produtoId: i.produtoId,
      produtoNome: banco.produtos.find((p) => p.id === i.produtoId)?.nome ?? '',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      subtotal: somar([i.quantidade * i.precoUnitario]),
    })),
  };
}

function diaJaFechado(usuarioId: number, data: string): boolean {
  return doUsuario(banco.fechamentos, usuarioId).some((f) => f.data === data);
}

function validarVenda(v: Partial<NovaVenda>): Resposta | null {
  const itens = Array.isArray(v.itens) ? v.itens : [];
  return validar(
    [futuro(v.data), 'data: A data da venda não pode ser futura'],
    [ausente(v.tipoLancamento), 'tipoLancamento: Informe o tipo de lançamento'],
    [longo(v.origem, 60), 'origem: A origem deve ter no máximo 60 caracteres'],
    [naoPositivo(v.valor), 'valor: O valor deve ser maior que zero'],
    [itens.length > 50, 'itens: No máximo 50 produtos diferentes por lançamento'],
    ...itens.flatMap((item, n): [boolean, string][] => [
      [ausente(item.produtoId), `itens[${n}].produtoId: Informe o produto`],
      [ausente(item.quantidade), `itens[${n}].quantidade: Informe a quantidade`],
      [
        naoPositivo(item.quantidade),
        `itens[${n}].quantidade: A quantidade deve ser maior que zero`,
      ],
      [item.quantidade > 9999, `itens[${n}].quantidade: Quantidade grande demais`],
    ]),
  );
}

/** VendaService.preencher: troca os itens e calcula o valor no "Por venda". */
function preencherVenda(
  usuarioId: number,
  venda: VendaNoBanco,
  v: NovaVenda,
  data: string,
): Resposta | null {
  // Produto repetido soma a quantidade; quem já estava na venda mantém o preço da época
  const quantidades = new Map<number, number>();
  for (const item of v.itens ?? []) {
    quantidades.set(item.produtoId, (quantidades.get(item.produtoId) ?? 0) + item.quantidade);
  }
  const itens: ItemNoBanco[] = [];
  for (const [produtoId, quantidade] of quantidades) {
    const produto = doUsuario(banco.produtos, usuarioId).find((p) => p.id === produtoId);
    if (!produto) return naoEncontrado('Produto não encontrado');
    const anterior = venda.itens.find((i) => i.produtoId === produtoId);
    itens.push({ produtoId, quantidade, precoUnitario: anterior?.precoUnitario ?? produto.preco });
  }

  let valor: number;
  if (v.tipoLancamento === 'POR_VENDA') {
    if (!itens.length) return regra('Escolha pelo menos um produto da venda');
    valor = somar(itens.map((i) => i.quantidade * i.precoUnitario));
  } else {
    if (ausente(v.valor)) return regra('Informe o total vendido no dia');
    valor = v.valor!;
  }

  venda.data = data;
  venda.tipoLancamento = v.tipoLancamento;
  venda.origem = v.origem ?? null;
  venda.formaPagamento = v.formaPagamento ?? null;
  venda.itens = itens;
  venda.valor = valor;
  // "Por venda" guarda a hora (a informada ou a de agora); "Total do dia" não tem hora
  venda.hora = v.tipoLancamento === 'POR_VENDA' ? comSegundos(v.hora ?? horaAgora()) : null;
  return null;
}

const naoAceitaVendas = (data: string) =>
  regra(`O dia ${diaMesAno(data)} já foi fechado e não aceita vendas`);
const vendaTravada = () => regra('Esta venda pertence a um dia já fechado e não pode ser alterada');

// ?data=2026-10-08 (sem data, usa hoje). A última venda lançada vem primeiro.
rota('GET', '/vendas', ({ usuarioId, param }) => {
  const dia = param('data') || hoje();
  const vendas = doUsuario(banco.vendas, usuarioId).filter((v) => v.data === dia);
  return ok(vendas.sort((a, b) => b.id - a.id).map(vendaResponse));
});

// Ranking dos produtos: ?inicio=2026-10-01&fim=2026-10-31 (sem datas, o dia de hoje)
rota('GET', '/vendas/mais-vendidos', ({ usuarioId, param }) => {
  const inicio = param('inicio') || hoje();
  const fim = param('fim') || inicio;
  if (fim < inicio) return regra('A data final não pode vir antes da inicial');
  const porProduto = new Map<number, MaisVendido>();
  for (const v of doUsuario(banco.vendas, usuarioId).filter(
    (x) => x.data >= inicio && x.data <= fim,
  )) {
    for (const i of v.itens) {
      const nome = banco.produtos.find((p) => p.id === i.produtoId)?.nome ?? '';
      const atual = porProduto.get(i.produtoId) ?? {
        produtoId: i.produtoId,
        nome,
        quantidade: 0,
        total: 0,
      };
      atual.quantidade += i.quantidade;
      atual.total = somar([atual.total, i.quantidade * i.precoUnitario]);
      porProduto.set(i.produtoId, atual);
    }
  }
  const ranking = [...porProduto.values()].sort(
    (a, b) => b.quantidade - a.quantidade || porNome(a, b),
  );
  return ok(ranking);
});

rota('POST', '/vendas', ({ usuarioId, corpo }) => {
  const v = corpo as NovaVenda;
  const problema = validarVenda(v);
  if (problema) return problema;
  const data = v.data || hoje();
  if (diaJaFechado(usuarioId, data)) return naoAceitaVendas(data);
  const venda: VendaNoBanco = {
    id: proximoId(banco.vendas),
    usuarioId,
    fechamentoDiarioId: null,
    data,
    hora: null,
    tipoLancamento: v.tipoLancamento,
    origem: null,
    formaPagamento: null,
    valor: 0,
    itens: [],
  };
  const recusa = preencherVenda(usuarioId, venda, v, data);
  if (recusa) return recusa;
  banco.vendas.push(venda);
  return ok(vendaResponse(venda), 201);
});

rota('PUT', '/vendas/:id', ({ usuarioId, id, corpo }) => {
  const v = corpo as NovaVenda;
  const problema = validarVenda(v);
  if (problema) return problema;
  const venda = doUsuario(banco.vendas, usuarioId).find((x) => x.id === id);
  if (!venda) return naoEncontrado('Venda não encontrada');
  if (venda.fechamentoDiarioId !== null) return vendaTravada();
  const data = v.data || venda.data;
  if (diaJaFechado(usuarioId, data)) return naoAceitaVendas(data);
  // trabalha numa cópia: se o pedido for recusado, a venda fica como estava
  const copia = { ...venda };
  const recusa = preencherVenda(usuarioId, copia, v, data);
  if (recusa) return recusa;
  Object.assign(venda, copia);
  return ok(vendaResponse(venda));
});

rota('DELETE', '/vendas/:id', ({ usuarioId, id }) => {
  const venda = doUsuario(banco.vendas, usuarioId).find((x) => x.id === id);
  if (!venda) return naoEncontrado('Venda não encontrada');
  if (venda.fechamentoDiarioId !== null) return vendaTravada();
  remover(banco.vendas, venda);
  return ok(null, 204);
});

// ---------------------------------------------------------------------------
// Fechamento do dia (RN02, RN03, RN05): cada fechamento é um dia trabalhado

// ?mes=2026-10 (sem mês, usa o atual), do dia 1 ao último
rota('GET', '/fechamentos', ({ usuarioId, param }) => {
  const mes = param('mes') || hoje().slice(0, 7);
  const doMes = doUsuario(banco.fechamentos, usuarioId).filter((f) => f.data.startsWith(mes));
  return ok(doMes.sort((a, b) => a.data.localeCompare(b.data)).map(semDono));
});

rota('POST', '/fechamentos', ({ usuarioId, corpo }) => {
  const { data } = corpo as { data?: string };
  const problema = validar(
    [ausente(data), 'data: Informe a data do fechamento'],
    [futuro(data), 'data: Não é possível fechar um dia futuro'],
  );
  if (problema) return problema;
  const dia = data!;
  if (diaJaFechado(usuarioId, dia)) return regra(`O dia ${diaMesAno(dia)} já foi fechado`);

  const abertas = doUsuario(banco.vendas, usuarioId).filter(
    (v) => v.data === dia && v.fechamentoDiarioId === null,
  );
  if (!abertas.length) return regra(`Não há vendas lançadas em ${diaMesAno(dia)} para fechar`);

  // Os percentuais são copiados pro fechamento: mudar a configuração depois não altera o histórico
  const total = somar(abertas.map((v) => v.valor));
  const config = configDe(usuarioId);
  const calculo = calcularFechamento(total, config);
  const fechamento: DoUsuario<FechamentoDiario> = {
    id: proximoId(banco.fechamentos),
    usuarioId,
    data: dia,
    totalVendido: total,
    percentualRetirada: config.percentualRetirada,
    valorRetirada: calculo.retirada,
    percentualSalario: config.dividirRetirada ? config.percentualSalario : 100,
    valorSalario: calculo.salario,
    valorReserva: calculo.reserva,
    fechadoEm: agora(),
  };
  banco.fechamentos.push(fechamento);
  abertas.forEach((v) => (v.fechamentoDiarioId = fechamento.id));

  // RN04: a parte da reserva entra sozinha no caixa da empresa
  if (calculo.reserva > 0) {
    banco.movimentos.push({
      id: proximoId(banco.movimentos),
      usuarioId,
      fechamentoDiarioId: fechamento.id,
      data: dia,
      tipo: 'ENTRADA',
      finalidade: null,
      descricao: `Fechamento do dia ${diaMes(dia)} · ${config.percentualReserva}% da retirada`,
      valor: calculo.reserva,
    });
  }
  return ok(semDono(fechamento), 201);
});

// ---------------------------------------------------------------------------
// Reserva da empresa (RN04)

const comSinal = (m: MovimentoNoBanco) => (m.tipo === 'ENTRADA' ? m.valor : -m.valor);

/** Do mais novo pro mais antigo, cada um com o saldo da reserva logo depois dele. */
function movimentosComSaldo(usuarioId: number): MovimentoReserva[] {
  const doMaisAntigo = doUsuario(banco.movimentos, usuarioId).sort(
    (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
  );
  let saldo = 0;
  return doMaisAntigo
    .map((m) => {
      saldo = somar([saldo, comSinal(m)]);
      return { ...semDono(m), saldoApos: saldo };
    })
    .reverse();
}

// ?tipo=ENTRADA ou ?tipo=SAIDA (sem o parâmetro, traz todos). O saldo é sempre o geral.
rota('GET', '/reserva/movimentos', ({ usuarioId, param }) => {
  const tipo = param('tipo');
  return ok(movimentosComSaldo(usuarioId).filter((m) => !tipo || m.tipo === tipo));
});

rota('POST', '/reserva/movimentos', ({ usuarioId, corpo }) => {
  const m = corpo as Partial<NovoMovimento>;
  const problema = validar(
    [futuro(m.data), 'data: A data não pode ser futura'],
    [ausente(m.tipo), 'tipo: Informe se é entrada ou saída'],
    [vazio(m.descricao), 'descricao: Informe a descrição'],
    [longo(m.descricao, 150), 'descricao: A descrição deve ter no máximo 150 caracteres'],
    [ausente(m.valor), 'valor: Informe o valor'],
    [naoPositivo(m.valor), 'valor: O valor deve ser maior que zero'],
  );
  if (problema) return problema;

  const data = m.data || hoje();
  let finalidade: MovimentoReserva['finalidade'] = null;
  if (m.tipo === 'SAIDA') {
    if (!m.finalidade) return regra('Informe a finalidade da saída: emergência ou investimento');
    const saldo = movimentosComSaldo(usuarioId)[0]?.saldoApos ?? 0;
    if (m.valor! > saldo)
      return regra(`A saída é maior que o saldo da reserva (R$ ${saldo.toFixed(2)})`);
    finalidade = m.finalidade;
  }

  const movimento: MovimentoNoBanco = {
    id: proximoId(banco.movimentos),
    usuarioId,
    fechamentoDiarioId: null,
    data,
    tipo: m.tipo!,
    finalidade,
    descricao: m.descricao!.trim(),
    valor: m.valor!,
  };
  banco.movimentos.push(movimento);
  // saldo acumulado até a data do movimento (calcularSaldoAte do back)
  const ateAData = doUsuario(banco.movimentos, usuarioId).filter((x) => x.data <= data);
  return ok({ ...semDono(movimento), saldoApos: somar(ateAData.map(comSinal)) }, 201);
});

// ---------------------------------------------------------------------------
// Compras (RN06)

function compraResponse(c: DoUsuario<Compra>) {
  const cartao = c.cartaoPjId ? banco.cartoes.find((k) => k.id === c.cartaoPjId) : undefined;
  return {
    ...semDono(c),
    categoriaNome: banco.categorias.find((k) => k.id === c.categoriaId)?.nome ?? '',
    cartaoPjApelido: cartao?.apelido ?? null,
    cartaoPjFinal: cartao?.finalCartao ?? null,
  };
}

function comprasDoMes(usuarioId: number, mes: string): DoUsuario<Compra>[] {
  return doUsuario(banco.compras, usuarioId).filter((c) => c.data.startsWith(mes));
}

function validarCompra(c: Partial<NovaCompra>): Resposta | null {
  return validar(
    [ausente(c.categoriaId), 'categoriaId: Informe a categoria'],
    [ausente(c.data), 'data: Informe a data da compra'],
    [futuro(c.data), 'data: A data da compra não pode ser futura'],
    [vazio(c.descricao), 'descricao: Informe a descrição'],
    [longo(c.descricao, 150), 'descricao: A descrição deve ter no máximo 150 caracteres'],
    [ausente(c.valor), 'valor: Informe o valor'],
    [naoPositivo(c.valor), 'valor: O valor deve ser maior que zero'],
    [ausente(c.formaPagamento), 'formaPagamento: Informe a forma de pagamento'],
  );
}

/** As regras entre campos do CompraService.preencher. */
function regrasDaCompra(
  usuarioId: number,
  c: NovaCompra,
  atual?: DoUsuario<Compra>,
): Resposta | null {
  const categoria = doUsuario(banco.categorias, usuarioId).find((k) => k.id === c.categoriaId);
  if (!categoria) return naoEncontrado('Categoria não encontrada');
  if (categoria.tipo !== 'COMPRA') return regra('Escolha uma categoria do tipo COMPRA');

  if (c.formaPagamento === 'CARTAO') {
    if (ausente(c.cartaoPjId)) return regra('Informe o cartão PJ usado na compra');
    if (!ausente(c.meioAVista)) return regra('Compra no cartão não tem meio de pagamento à vista');
    const cartao = doUsuario(banco.cartoes, usuarioId).find((k) => k.id === c.cartaoPjId);
    if (!cartao) return naoEncontrado('Cartão não encontrado');
    // Cartão desativado não recebe compras novas (a compra antiga pode continuar nele)
    const cartaoMudou = !atual || atual.cartaoPjId !== cartao.id;
    if (cartaoMudou && !cartao.ativo) return regra(`O cartão ${cartao.apelido} está desativado`);
  } else if (!ausente(c.cartaoPjId)) {
    return regra('Compra à vista não usa cartão PJ');
  }
  return null;
}

function dadosDaCompra(c: NovaCompra): NovaCompra {
  const { data, valor, formaPagamento, categoriaId } = c;
  const noCartao = formaPagamento === 'CARTAO';
  return {
    data,
    descricao: c.descricao.trim(),
    valor,
    formaPagamento,
    meioAVista: c.meioAVista ?? null,
    cartaoPjId: noCartao ? c.cartaoPjId : null,
    categoriaId,
  };
}

// ?mes=2026-10 (sem mês, usa o atual). Mais recentes primeiro.
rota('GET', '/compras', ({ usuarioId, param }) => {
  const compras = comprasDoMes(usuarioId, param('mes') || hoje().slice(0, 7));
  return ok(
    compras.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).map(compraResponse),
  );
});

// Cards da tela Compras: total, gasto por cartão, à vista e por categoria
rota('GET', '/compras/resumo', ({ usuarioId, param }) => {
  const compras = comprasDoMes(usuarioId, param('mes') || hoje().slice(0, 7));
  const total = somar(compras.map((c) => c.valor));
  const percentual = (parte: number) => (total ? Math.round((parte * 1000) / total) / 10 : 0);

  const cartoes = doUsuario(banco.cartoes, usuarioId)
    .map((cartao) => ({ cartao, doCartao: compras.filter((c) => c.cartaoPjId === cartao.id) }))
    .filter(({ doCartao }) => doCartao.length > 0)
    .sort((a, b) => a.cartao.apelido.localeCompare(b.cartao.apelido, 'pt-BR'))
    .map(({ cartao, doCartao }) => {
      const doMes = somar(doCartao.map((c) => c.valor));
      return {
        cartaoId: cartao.id,
        apelido: cartao.apelido,
        finalCartao: cartao.finalCartao,
        quantidade: doCartao.length,
        total: doMes,
        percentual: percentual(doMes),
      };
    });

  const aVista = compras.filter((c) => c.formaPagamento === 'A_VISTA');
  const totalAVista = somar(aVista.map((c) => c.valor));

  const categorias = doUsuario(banco.categorias, usuarioId)
    .map((k) => ({ categoria: k, daCategoria: compras.filter((c) => c.categoriaId === k.id) }))
    .filter(({ daCategoria }) => daCategoria.length > 0)
    .map(({ categoria, daCategoria }) => {
      const daCat = somar(daCategoria.map((c) => c.valor));
      return {
        categoriaId: categoria.id,
        nome: categoria.nome,
        total: daCat,
        percentual: percentual(daCat),
      };
    })
    .sort((a, b) => b.total - a.total);

  const resumo: ComprasResumo = {
    total,
    quantidade: compras.length,
    totalNoCartao: somar(cartoes.map((c) => c.total)),
    cartoes,
    aVista: { quantidade: aVista.length, total: totalAVista, percentual: percentual(totalAVista) },
    categorias,
  };
  return ok(resumo);
});

rota('POST', '/compras', ({ usuarioId, corpo }) => {
  const problema = validarCompra(corpo) ?? regrasDaCompra(usuarioId, corpo);
  if (problema) return problema;
  const compra = { id: proximoId(banco.compras), usuarioId, ...dadosDaCompra(corpo) };
  banco.compras.push(compra);
  return ok(compraResponse(compra), 201);
});

rota('PUT', '/compras/:id', ({ usuarioId, id, corpo }) => {
  const invalida = validarCompra(corpo);
  if (invalida) return invalida;
  const compra = doUsuario(banco.compras, usuarioId).find((c) => c.id === id);
  if (!compra) return naoEncontrado('Compra não encontrada');
  const problema = regrasDaCompra(usuarioId, corpo, compra);
  if (problema) return problema;
  Object.assign(compra, dadosDaCompra(corpo));
  return ok(compraResponse(compra));
});

rota('DELETE', '/compras/:id', ({ usuarioId, id }) => {
  const compra = doUsuario(banco.compras, usuarioId).find((c) => c.id === id);
  if (!compra) return naoEncontrado('Compra não encontrada');
  remover(banco.compras, compra);
  return ok(null, 204);
});

// ?tipo=COMPRA ou ?tipo=PRODUTO. Quem ainda não tem nenhuma categoria ganha as padrão.
rota('GET', '/categorias', ({ usuarioId, param }) => {
  if (!banco.categorias.some((k) => k.usuarioId === usuarioId)) {
    banco.categorias.push(...categoriasPadrao(usuarioId, proximoId(banco.categorias)));
  }
  const tipo = param('tipo');
  const categorias = doUsuario(banco.categorias, usuarioId).filter((k) => !tipo || k.tipo === tipo);
  return ok(categorias.sort(porNome).map(semDono));
});

// ---------------------------------------------------------------------------
// Cartões PJ (RN07)

function validarCartao(c: Partial<NovoCartao>): Resposta | null {
  const diaInvalido = (dia: unknown) => typeof dia === 'number' && (dia < 1 || dia > 31);
  return validar(
    [vazio(c.apelido), 'apelido: Informe o apelido do cartão'],
    [longo(c.apelido, 40), 'apelido: O apelido deve ter no máximo 40 caracteres'],
    [longo(c.bandeira, 20), 'bandeira: A bandeira deve ter no máximo 20 caracteres'],
    [vazio(c.finalCartao), 'finalCartao: Informe o final do cartão'],
    [
      !vazio(c.finalCartao) && !/^\d{4}$/.test(c.finalCartao!),
      'finalCartao: O final do cartão deve ter 4 números',
    ],
    [diaInvalido(c.diaFechamento), 'diaFechamento: Dia inválido'],
    [diaInvalido(c.diaVencimento), 'diaVencimento: Dia inválido'],
    [ausente(c.ativo), 'ativo: Informe se o cartão está ativo'],
  );
}

function dadosDoCartao(c: NovoCartao): NovoCartao {
  return {
    apelido: c.apelido.trim(),
    bandeira: c.bandeira ?? null,
    finalCartao: c.finalCartao,
    diaFechamento: c.diaFechamento ?? null,
    diaVencimento: c.diaVencimento ?? null,
    ativo: c.ativo,
  };
}

const apelidoRepetido = (apelido: string) => regra(`Já existe um cartão com o apelido ${apelido}`);

rota('GET', '/cartoes', ({ usuarioId }) => {
  const cartoes = doUsuario(banco.cartoes, usuarioId).sort((a, b) =>
    a.apelido.localeCompare(b.apelido, 'pt-BR'),
  );
  return ok(cartoes.map(semDono));
});

rota('POST', '/cartoes', ({ usuarioId, corpo }) => {
  const problema = validarCartao(corpo);
  if (problema) return problema;
  const dados = dadosDoCartao(corpo);
  if (doUsuario(banco.cartoes, usuarioId).some((k) => mesmoTexto(k.apelido, dados.apelido))) {
    return apelidoRepetido(dados.apelido);
  }
  const cartao = { id: proximoId(banco.cartoes), usuarioId, ...dados };
  banco.cartoes.push(cartao);
  return ok(semDono(cartao), 201);
});

rota('PUT', '/cartoes/:id', ({ usuarioId, id, corpo }) => {
  const problema = validarCartao(corpo);
  if (problema) return problema;
  const cartao = doUsuario(banco.cartoes, usuarioId).find((k) => k.id === id);
  if (!cartao) return naoEncontrado('Cartão não encontrado');
  const dados = dadosDoCartao(corpo);
  const trocouApelido = !mesmoTexto(cartao.apelido, dados.apelido);
  if (
    trocouApelido &&
    doUsuario(banco.cartoes, usuarioId).some((k) => mesmoTexto(k.apelido, dados.apelido))
  ) {
    return apelidoRepetido(dados.apelido);
  }
  Object.assign(cartao, dados);
  return ok(semDono(cartao));
});

// ---------------------------------------------------------------------------
// Produtos do site

function produtoResponse(p: DoUsuario<Produto>) {
  return {
    ...semDono(p),
    categoriaNome: banco.categorias.find((k) => k.id === p.categoriaId)?.nome ?? '',
  };
}

function validarProduto(p: Partial<NovoProduto>): Resposta | null {
  return validar(
    [ausente(p.categoriaId), 'categoriaId: Informe a categoria'],
    [vazio(p.codigo), 'codigo: Informe o código'],
    [longo(p.codigo, 10), 'codigo: O código deve ter no máximo 10 caracteres'],
    [vazio(p.nome), 'nome: Informe o nome'],
    [longo(p.nome, 80), 'nome: O nome deve ter no máximo 80 caracteres'],
    [longo(p.descricao, 255), 'descricao: A descrição deve ter no máximo 255 caracteres'],
    [ausente(p.preco), 'preco: Informe o preço'],
    [naoPositivo(p.preco), 'preco: O preço deve ser maior que zero'],
    [longo(p.fotoUrl, 255), 'fotoUrl: O link da foto deve ter no máximo 255 caracteres'],
    [ausente(p.mostrarNoSite), 'mostrarNoSite: Informe se o produto aparece no site'],
    [ausente(p.destaque), 'destaque: Informe se o produto é destaque'],
  );
}

function categoriaDeProduto(usuarioId: number, categoriaId: number): Resposta | null {
  const categoria = doUsuario(banco.categorias, usuarioId).find((k) => k.id === categoriaId);
  if (!categoria) return naoEncontrado('Categoria não encontrada');
  return categoria.tipo === 'PRODUTO' ? null : regra('Escolha uma categoria do tipo PRODUTO');
}

function dadosDoProduto(p: NovoProduto): NovoProduto {
  const { preco, mostrarNoSite, destaque, categoriaId } = p;
  return {
    codigo: p.codigo.trim(),
    nome: p.nome.trim(),
    descricao: p.descricao ?? null,
    preco,
    fotoUrl: p.fotoUrl ?? null,
    mostrarNoSite,
    destaque,
    categoriaId,
  };
}

const codigoRepetido = (codigo: string) => regra(`Já existe um produto com o código ${codigo}`);

// Landing page, sem login: só o que está marcado pro site, destaques primeiro
rota(
  'GET',
  '/publico/cardapio',
  () => {
    const doSite = doUsuario(banco.produtos, DONO_DO_SITE)
      .filter((p) => p.mostrarNoSite)
      .sort((a, b) => Number(b.destaque) - Number(a.destaque) || porNome(a, b));
    const cardapio: ProdutoSite[] = doSite.map((p) => ({
      id: p.id,
      categoria: banco.categorias.find((k) => k.id === p.categoriaId)?.nome ?? '',
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco,
      fotoUrl: p.fotoUrl,
      destaque: p.destaque,
    }));
    return ok(cardapio);
  },
  true,
);

rota('GET', '/produtos', ({ usuarioId }) =>
  ok(doUsuario(banco.produtos, usuarioId).sort(porNome).map(produtoResponse)),
);

// Envio de foto: na API falsa não há disco, então a foto vira um endereço temporário do navegador
rota('POST', '/produtos/foto', ({ corpo }) => {
  const arquivo = corpo instanceof FormData ? corpo.get('arquivo') : null;
  if (!(arquivo instanceof File)) return regra('Escolha uma foto para enviar');
  return ok({ url: URL.createObjectURL(arquivo) }, 201);
});

rota('POST', '/produtos', ({ usuarioId, corpo }) => {
  const problema = validarProduto(corpo) ?? categoriaDeProduto(usuarioId, corpo.categoriaId);
  if (problema) return problema;
  const dados = dadosDoProduto(corpo);
  if (doUsuario(banco.produtos, usuarioId).some((x) => mesmoTexto(x.codigo, dados.codigo))) {
    return codigoRepetido(dados.codigo);
  }
  const produto = { id: proximoId(banco.produtos), usuarioId, ...dados };
  banco.produtos.push(produto);
  return ok(produtoResponse(produto), 201);
});

rota('PUT', '/produtos/:id', ({ usuarioId, id, corpo }) => {
  const invalido = validarProduto(corpo);
  if (invalido) return invalido;
  const produto = doUsuario(banco.produtos, usuarioId).find((p) => p.id === id);
  if (!produto) return naoEncontrado('Produto não encontrado');
  const problema = categoriaDeProduto(usuarioId, corpo.categoriaId);
  if (problema) return problema;
  const dados = dadosDoProduto(corpo);
  const trocouCodigo = !mesmoTexto(produto.codigo, dados.codigo);
  if (
    trocouCodigo &&
    doUsuario(banco.produtos, usuarioId).some((x) => mesmoTexto(x.codigo, dados.codigo))
  ) {
    return codigoRepetido(dados.codigo);
  }
  Object.assign(produto, dados);
  return ok(produtoResponse(produto));
});

rota('DELETE', '/produtos/:id', ({ usuarioId, id }) => {
  const produto = doUsuario(banco.produtos, usuarioId).find((p) => p.id === id);
  if (!produto) return naoEncontrado('Produto não encontrado');
  if (banco.vendas.some((v) => v.itens.some((i) => i.produtoId === produto.id))) {
    return regra(
      'Este produto já aparece em vendas e não pode ser excluído. Desligue o "No site" pra tirar do cardápio.',
    );
  }
  remover(banco.produtos, produto);
  return ok(null, 204);
});
