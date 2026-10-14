import {
  CartaoPj,
  Categoria,
  Compra,
  Configuracao,
  FechamentoDiario,
  FormaPagamentoVenda,
  MeioAVista,
  MovimentoReserva,
  NovaVenda,
  Produto,
  Usuario,
} from '../models';
import { calcularFechamento, somar } from '../regras/caixa';

// Dados da API falsa, guardados do jeito que o back guarda no MySQL.
// Outubro é igual ao protótipo do Figma. Agosto e setembro só aparecem como totais
// no protótipo, então aqui eles são espalhados pelos dias do mês, batendo com esses totais.

export type DoUsuario<T> = T & { usuarioId: number };

export type UsuarioNoBanco = Usuario & { senha: string };
export type ConfigNoBanco = DoUsuario<Configuracao> & { id: number; atualizadoEm: string };
// Item da venda como fica na tabela venda_item: o preço é o da hora da venda
export interface ItemNoBanco {
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
}
export type VendaNoBanco = DoUsuario<Omit<NovaVenda, 'valor' | 'itens'>> & {
  id: number;
  fechamentoDiarioId: number | null;
  valor: number;
  itens: ItemNoBanco[];
};
export type MovimentoNoBanco = DoUsuario<Omit<MovimentoReserva, 'saldoApos'>>;

export interface Banco {
  usuarios: UsuarioNoBanco[];
  configuracoes: ConfigNoBanco[];
  vendas: VendaNoBanco[];
  fechamentos: DoUsuario<FechamentoDiario>[];
  movimentos: MovimentoNoBanco[];
  cartoes: DoUsuario<CartaoPj>[];
  categorias: DoUsuario<Categoria>[];
  compras: DoUsuario<Compra>[];
  produtos: DoUsuario<Produto>[];
}

// Configuração que o back cria na primeira vez que a conta abre o painel
// (ConfiguracaoService.criarPadrao): 30% de retirada, dividida 50/50
export const CONFIG_PADRAO: Configuracao = {
  percentualRetirada: 30,
  dividirRetirada: true,
  percentualSalario: 50,
  percentualReserva: 50,
  metaReserva: null,
};

// As mesmas categorias que o back cria pra quem ainda não tem nenhuma (CategoriaService)
const CATEGORIAS: [Categoria['tipo'], string][] = [
  ['COMPRA', 'Carnes e insumos'],
  ['COMPRA', 'Bebidas'],
  ['COMPRA', 'Descartáveis'],
  ['COMPRA', 'Contas'],
  ['COMPRA', 'Manutenção'],
  ['PRODUTO', 'Carnes'],
  ['PRODUTO', 'Frango'],
  ['PRODUTO', 'Especiais'],
  ['PRODUTO', 'Acompanhamentos'],
  ['PRODUTO', 'Bebidas'],
];

export function categoriasPadrao(usuarioId: number, primeiroId: number): DoUsuario<Categoria>[] {
  return CATEGORIAS.map(([tipo, nome], i) => ({ id: primeiroId + i, usuarioId, tipo, nome }));
}

const EVANDRO = 1;

// Outubro: dias fechados (05/10 foi folga)
const OUTUBRO: [string, number][] = [
  ['2026-10-01', 1120],
  ['2026-10-02', 1640],
  ['2026-10-03', 2210],
  ['2026-10-04', 1850],
  ['2026-10-06', 860],
  ['2026-10-07', 940],
];

// Produtos de exemplo (ids de 1 a 8): Picanha 18, Alcatra 15, Frango com Bacon 13, Linguiça 11,
// Coração 12, Queijo Coalho 12, Kafta 13 e Pão de Alho 10
const PICANHA = 1,
  ALCATRA = 2,
  FRANGO = 3,
  LINGUICA = 4,
  CORACAO = 5,
  QUEIJO = 6,
  PAO = 8;

// Hoje (08/10): venda a venda, dia ainda em aberto. [hora, origem, pagamento, [produto, quantidade][]]
// O valor de cada venda é a soma dos itens: 96, 54, 182, 128, 240, 310, 66 e 404 (R$ 1.480 no dia)
const HOJE: [string, string, FormaPagamentoVenda, [number, number][]][] = [
  [
    '18:12:00',
    'Mesa 3',
    'PIX',
    [
      [PICANHA, 4],
      [QUEIJO, 2],
    ],
  ],
  [
    '18:40:00',
    'Balcão',
    'DINHEIRO',
    [
      [ALCATRA, 2],
      [CORACAO, 2],
    ],
  ],
  [
    '19:05:00',
    'Mesa 7',
    'CREDITO',
    [
      [PICANHA, 5],
      [FRANGO, 4],
      [PAO, 4],
    ],
  ],
  [
    '19:31:00',
    'WhatsApp',
    'PIX',
    [
      [PICANHA, 4],
      [LINGUICA, 4],
      [QUEIJO, 1],
    ],
  ],
  [
    '19:58:00',
    'Mesa 2',
    'DEBITO',
    [
      [PICANHA, 8],
      [ALCATRA, 4],
      [CORACAO, 3],
    ],
  ],
  [
    '20:20:00',
    'Mesa 5',
    'PIX',
    [
      [PICANHA, 10],
      [ALCATRA, 6],
      [PAO, 4],
    ],
  ],
  [
    '20:47:00',
    'Balcão',
    'DINHEIRO',
    [
      [PICANHA, 3],
      [QUEIJO, 1],
    ],
  ],
  [
    '21:15:00',
    'Mesa 8',
    'CREDITO',
    [
      [PICANHA, 12],
      [FRANGO, 8],
      [LINGUICA, 4],
      [PAO, 4],
    ],
  ],
];

// Nos dias fechados (lançados como "Total do dia") os itens são aproximados: cada produto
// fica com uma parte do total, como nas vendas de hoje
const PARTE_DO_DIA: [number, number][] = [
  [PICANHA, 0.36],
  [ALCATRA, 0.14],
  [FRANGO, 0.13],
  [LINGUICA, 0.1],
  [CORACAO, 0.08],
  [QUEIJO, 0.08],
  [PAO, 0.11],
];

// Compras de outubro: [data, descrição, valor, categoria, cartão PJ ou null, meio à vista ou null]
const COMPRAS_OUTUBRO: [string, string, number, number, number | null, MeioAVista | null][] = [
  ['2026-10-08', 'Carnes – açougue', 684.3, 1, 1, null],
  ['2026-10-07', 'Carvão (10 sacos)', 390, 1, null, 'PIX'],
  ['2026-10-06', 'Distribuidora de bebidas', 742.8, 2, 2, null],
  ['2026-10-05', 'Frango e linguiça', 512, 1, 1, null],
  ['2026-10-03', 'Gás P13', 125, 4, null, 'DINHEIRO'],
  ['2026-10-02', 'Carnes – açougue', 988, 1, 1, null],
  ['2026-10-01', 'Embalagens e espetos', 100, 3, null, 'PIX'],
];

// Agosto e setembro: [cartão PJ ou null, quantidade de compras, total do mês]
const COMPRAS_ANTERIORES: Record<string, [number | null, number, number][]> = {
  '2026-08': [
    [1, 26, 11870.2],
    [2, 8, 4980],
    [null, 12, 3410],
  ],
  '2026-09': [
    [1, 28, 12360.4],
    [2, 9, 5124.6],
    [null, 14, 3945],
  ],
};

// O que cada forma de pagamento costuma comprar: [descrição, categoria, meio à vista]
const ITENS: Record<string, [string, number, MeioAVista | null][]> = {
  '1': [
    ['Carnes – açougue', 1, null],
    ['Frango e linguiça', 1, null],
    ['Queijo coalho e pão de alho', 1, null],
  ],
  '2': [
    ['Distribuidora de bebidas', 2, null],
    ['Conta de energia', 4, null],
    ['Internet e telefone', 4, null],
  ],
  avista: [
    ['Carvão (10 sacos)', 1, 'PIX'],
    ['Gás P13', 4, 'DINHEIRO'],
    ['Embalagens e espetos', 3, 'PIX'],
    ['Gelo', 2, 'DINHEIRO'],
  ],
};

// Setembro: 24 dias trabalhados, R$ 38.920 vendidos no mês
const FOLGAS_SETEMBRO = [7, 14, 15, 21, 22, 28];
const VENDAS_SETEMBRO = 38920;
const PESO_DO_DIA = [1.25, 0.7, 0.75, 0.85, 0.95, 1.3, 1.45]; // domingo a sábado

export function criarBanco(): Banco {
  const config: ConfigNoBanco = {
    id: 1,
    usuarioId: EVANDRO,
    percentualRetirada: 30,
    dividirRetirada: true,
    percentualSalario: 50,
    percentualReserva: 50,
    metaReserva: 10000,
    atualizadoEm: '2026-09-01T10:00:00',
  };

  const banco: Banco = {
    usuarios: [
      {
        id: EVANDRO,
        nome: 'Evandro',
        nomeNegocio: "Evandro's Grill",
        email: 'evandro@evandrosgrill.com.br',
        senha: 'grill123',
      },
    ],
    configuracoes: [config],
    vendas: [],
    fechamentos: [],
    movimentos: [],
    cartoes: [
      {
        id: 1,
        usuarioId: EVANDRO,
        apelido: 'PJ Compras',
        bandeira: 'Mastercard',
        finalCartao: '4417',
        diaFechamento: 25,
        diaVencimento: 5,
        ativo: true,
      },
      {
        id: 2,
        usuarioId: EVANDRO,
        apelido: 'PJ Contas',
        bandeira: 'Visa',
        finalCartao: '0938',
        diaFechamento: 10,
        diaVencimento: 20,
        ativo: true,
      },
    ],
    categorias: categoriasPadrao(EVANDRO, 1),
    compras: [],
    produtos: [
      produto(
        1,
        'ESP-001',
        'Espeto de Picanha',
        'Picanha temperada no sal grosso.',
        18,
        6,
        true,
        true,
      ),
      produto(2, 'ESP-002', 'Espeto de Alcatra', 'Alcatra com pimentão.', 15, 6, true, false),
      produto(
        3,
        'ESP-003',
        'Frango com Bacon',
        'Coxa de frango enrolada no bacon.',
        13,
        7,
        true,
        true,
      ),
      produto(4, 'ESP-004', 'Linguiça Toscana', 'Linguiça toscana na brasa.', 11, 6, true, false),
      produto(5, 'ESP-005', 'Coração de Frango', 'Coração temperado com alho.', 12, 7, true, false),
      produto(6, 'ESP-006', 'Queijo Coalho', 'Queijo coalho dourado na brasa.', 12, 8, true, false),
      produto(7, 'ESP-007', 'Kafta', 'Kafta de carne com hortelã.', 13, 8, false, false),
      produto(8, 'ACO-001', 'Pão de Alho', 'Pão de alho cremoso.', 10, 9, true, false),
    ],
  };

  // Dias fechados de setembro e outubro (cada um vira um lançamento "total do dia")
  for (const [data, total] of [...diasDeSetembro(), ...OUTUBRO]) {
    const calculo = calcularFechamento(total, config);
    const id = banco.fechamentos.length + 1;
    banco.fechamentos.push({
      id,
      usuarioId: EVANDRO,
      data,
      totalVendido: total,
      percentualRetirada: 30,
      valorRetirada: calculo.retirada,
      percentualSalario: 50,
      valorSalario: calculo.salario,
      valorReserva: calculo.reserva,
      fechadoEm: `${data}T23:30:00`,
    });
    const itens = itensDe(
      banco,
      PARTE_DO_DIA.map(([produtoId, parte]) => [
        produtoId,
        Math.round((total * parte) / precoDe(banco, produtoId)),
      ]),
    );
    banco.vendas.push(venda(banco, data, null, 'TOTAL_DIA', null, null, total, itens, id));
  }
  for (const [hora, origem, forma, pedido] of HOJE) {
    const itens = itensDe(banco, pedido);
    const valor = somar(itens.map((i) => i.quantidade * i.precoUnitario));
    banco.vendas.push(
      venda(banco, '2026-10-08', hora, 'POR_VENDA', origem, forma, valor, itens, null),
    );
  }

  // Reserva: setembro resumido como no protótipo + a entrada de cada fechamento de outubro
  movimento(banco, '2026-09-21', 'ENTRADA', null, 'Saldo acumulado até 21/09', 4378.5, null);
  movimento(banco, '2026-09-22', 'SAIDA', 'EMERGENCIA', 'Conserto da churrasqueira', 1200, null);
  movimento(banco, '2026-09-30', 'ENTRADA', null, 'Fechamentos de 23 a 30/09', 1459.5, null);
  for (const f of banco.fechamentos.filter((f) => f.data >= '2026-10-01')) {
    const dia = `${f.data.slice(8)}/${f.data.slice(5, 7)}`;
    movimento(
      banco,
      f.data,
      'ENTRADA',
      null,
      `Fechamento do dia ${dia} · 50% da retirada`,
      f.valorReserva,
      f.id,
    );
  }

  // Compras
  for (const [data, descricao, valor, categoriaId, cartaoPjId, meioAVista] of COMPRAS_OUTUBRO) {
    compra(banco, data, descricao, valor, categoriaId, cartaoPjId, meioAVista);
  }
  for (const [mes, lotes] of Object.entries(COMPRAS_ANTERIORES)) {
    for (const [cartaoPjId, quantidade, total] of lotes) {
      const itens = ITENS[String(cartaoPjId ?? 'avista')];
      const pesos = Array.from({ length: quantidade }, (_, i) => [5, 3, 4, 2, 6, 3, 4][i % 7]);
      dividir(Math.round(total * 100), pesos).forEach((centavos, i) => {
        const [descricao, categoriaId, meio] = itens[i % itens.length];
        const dia = String(1 + Math.floor((i * 28) / quantidade)).padStart(2, '0');
        compra(banco, `${mes}-${dia}`, descricao, centavos / 100, categoriaId, cartaoPjId, meio);
      });
    }
  }

  return banco;
}

/** Divide um total inteiro em partes proporcionais aos pesos, sem perder nada no arredondamento. */
function dividir(total: number, pesos: number[]): number[] {
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const partes = pesos.map((peso) => Math.floor((total * peso) / somaPesos));
  partes[0] += total - partes.reduce((a, b) => a + b, 0);
  return partes;
}

function diasDeSetembro(): [string, number][] {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1).filter(
    (d) => !FOLGAS_SETEMBRO.includes(d),
  );
  const totais = dividir(
    VENDAS_SETEMBRO,
    dias.map((d) => PESO_DO_DIA[new Date(2026, 8, d).getDay()]),
  );
  return dias.map((d, i) => [`2026-09-${String(d).padStart(2, '0')}`, totais[i]]);
}

function venda(
  banco: Banco,
  data: string,
  hora: string | null,
  tipoLancamento: NovaVenda['tipoLancamento'],
  origem: string | null,
  formaPagamento: FormaPagamentoVenda | null,
  valor: number,
  itens: ItemNoBanco[],
  fechamentoDiarioId: number | null,
): VendaNoBanco {
  const id = banco.vendas.length + 1;
  return {
    id,
    usuarioId: EVANDRO,
    data,
    hora,
    tipoLancamento,
    origem,
    formaPagamento,
    valor,
    itens,
    fechamentoDiarioId,
  };
}

function precoDe(banco: Banco, produtoId: number): number {
  return banco.produtos.find((p) => p.id === produtoId)!.preco;
}

function itensDe(banco: Banco, pedido: [number, number][]): ItemNoBanco[] {
  return pedido
    .filter(([, quantidade]) => quantidade > 0)
    .map(([produtoId, quantidade]) => ({
      produtoId,
      quantidade,
      precoUnitario: precoDe(banco, produtoId),
    }));
}

function movimento(
  banco: Banco,
  data: string,
  tipo: MovimentoReserva['tipo'],
  finalidade: MovimentoReserva['finalidade'],
  descricao: string,
  valor: number,
  fechamentoDiarioId: number | null,
): void {
  const id = banco.movimentos.length + 1;
  banco.movimentos.push({
    id,
    usuarioId: EVANDRO,
    data,
    tipo,
    finalidade,
    descricao,
    valor,
    fechamentoDiarioId,
  });
}

function compra(
  banco: Banco,
  data: string,
  descricao: string,
  valor: number,
  categoriaId: number,
  cartaoPjId: number | null,
  meioAVista: MeioAVista | null,
): void {
  banco.compras.push({
    id: banco.compras.length + 1,
    usuarioId: EVANDRO,
    data,
    descricao,
    valor,
    formaPagamento: cartaoPjId ? 'CARTAO' : 'A_VISTA',
    meioAVista,
    cartaoPjId,
    categoriaId,
  });
}

function produto(
  id: number,
  codigo: string,
  nome: string,
  descricao: string,
  preco: number,
  categoriaId: number,
  mostrarNoSite: boolean,
  destaque: boolean,
): DoUsuario<Produto> {
  return {
    id,
    usuarioId: EVANDRO,
    codigo,
    nome,
    descricao,
    preco,
    fotoUrl: null,
    mostrarNoSite,
    destaque,
    categoriaId,
  };
}
