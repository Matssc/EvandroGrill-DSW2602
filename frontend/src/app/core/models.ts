// Espelho do JSON que o back (Spring Boot, pasta backend/) manda e recebe.
// Datas vão como texto ISO: '2026-10-08'. Valores em reais, com 2 casas.
// Os nomes dos enums são os mesmos do back (backend/.../model/enums).

export type FormaPagamentoVenda = 'PIX' | 'DINHEIRO' | 'DEBITO' | 'CREDITO';
export type FormaPagamentoCompra = 'CARTAO' | 'A_VISTA';
export type MeioAVista = 'PIX' | 'DINHEIRO' | 'DEBITO';
export type TipoLancamento = 'POR_VENDA' | 'TOTAL_DIA';

// usuario (RN10)
export interface Usuario {
  id: number;
  nome: string;
  nomeNegocio: string;
  email: string;
}

// POST /api/auth/login
export interface DadosLogin {
  email: string;
  senha: string;
}

// Resposta do login
export interface Sessao {
  token: string;
  usuario: Usuario;
}

// configuracao (RN02, RN03, RN04)
export interface Configuracao {
  percentualRetirada: number;
  dividirRetirada: boolean;
  percentualSalario: number;
  percentualReserva: number;
  metaReserva: number | null;
}

// venda (RN01)
export interface Venda {
  id: number;
  data: string;
  hora: string | null; // '19:42:00'; vazia no "Total do dia"
  tipoLancamento: TipoLancamento;
  origem: string | null;
  formaPagamento: FormaPagamentoVenda | null;
  valor: number;
  fechada: boolean; // true depois que o dia é fechado: aí a venda não muda mais
  itens: ItemVenda[];
}

// venda_item: um produto dentro da venda, com o preço da hora da venda
export interface ItemVenda {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

// O que vai no POST/PUT: "Por venda" precisa de itens e o back calcula o valor;
// "Total do dia" precisa do valor e os itens são opcionais
export interface ItemEscolhido {
  produtoId: number;
  quantidade: number;
}
export interface NovaVenda {
  data: string;
  hora: string | null;
  tipoLancamento: TipoLancamento;
  origem: string | null;
  formaPagamento: FormaPagamentoVenda | null;
  valor: number | null;
  itens: ItemEscolhido[];
}

// GET /api/vendas/mais-vendidos?inicio=&fim=: quanto saiu de cada produto no período
export interface MaisVendido {
  produtoId: number;
  nome: string;
  quantidade: number;
  total: number;
}

// fechamento_diario (RN02, RN03, RN05)
export interface FechamentoDiario {
  id: number;
  data: string;
  totalVendido: number;
  percentualRetirada: number;
  valorRetirada: number;
  percentualSalario: number;
  valorSalario: number;
  valorReserva: number;
  fechadoEm: string;
}

// movimento_reserva (RN04)
export interface MovimentoReserva {
  id: number;
  data: string;
  tipo: 'ENTRADA' | 'SAIDA';
  finalidade: 'EMERGENCIA' | 'INVESTIMENTO' | null;
  descricao: string;
  valor: number;
  saldoApos: number; // saldo da reserva logo depois deste movimento
  fechamentoDiarioId: number | null; // preenchido na entrada que veio de um fechamento do dia
}
export type NovoMovimento = Omit<MovimentoReserva, 'id' | 'saldoApos' | 'fechamentoDiarioId'>;

// Saldo + histórico da reserva (montado no ApiService a partir de GET /api/reserva/movimentos)
export interface Reserva {
  saldo: number;
  movimentos: MovimentoReserva[];
}

// cartao_pj (RN07)
export interface CartaoPj {
  id: number;
  apelido: string;
  bandeira: string | null;
  finalCartao: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
  ativo: boolean;
}
export type NovoCartao = Omit<CartaoPj, 'id'>;

// Gasto do mês por forma de pagamento (RN07, RN09): uma linha por cartão usado no mês,
// mais uma pra "À vista". Montado no ApiService a partir de GET /api/compras/resumo.
export interface GastoCartao {
  formaPagamento: FormaPagamentoCompra;
  cartaoPjId: number | null;
  forma: string; // apelido do cartão ou "À vista"
  finalCartao: string | null;
  qtdCompras: number;
  total: number;
}

// GET /api/compras/resumo?mes=2026-10 (cards da tela Compras)
export interface ComprasResumo {
  total: number;
  quantidade: number;
  totalNoCartao: number;
  cartoes: {
    cartaoId: number;
    apelido: string;
    finalCartao: string;
    quantidade: number;
    total: number;
    percentual: number;
  }[];
  aVista: { quantidade: number; total: number; percentual: number };
  categorias: { categoriaId: number; nome: string; total: number; percentual: number }[];
}

// categoria (RN06)
export interface Categoria {
  id: number;
  tipo: 'COMPRA' | 'PRODUTO';
  nome: string;
}

// compra (RN06, RN07)
export interface Compra {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamentoCompra;
  meioAVista: MeioAVista | null;
  cartaoPjId: number | null;
  categoriaId: number;
}
export type NovaCompra = Omit<Compra, 'id'>;

// produto (cardápio da landing page)
export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco: number;
  fotoUrl: string | null;
  mostrarNoSite: boolean;
  destaque: boolean;
  categoriaId: number;
}
export type NovoProduto = Omit<Produto, 'id'>;

// GET /api/publico/cardapio: o que a landing page mostra (sem login)
export interface ProdutoSite {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  fotoUrl: string | null;
  destaque: boolean;
  categoria: string;
}

// Fechamento do mês (RN08). Montado no ApiService com os fechamentos do mês
// (GET /api/fechamentos) e o resumo das compras (GET /api/compras/resumo).
export interface ResumoMes {
  mes: string;
  diasTrabalhados: number;
  vendas: number;
  retiradas: number;
  salario: number;
  reserva: number;
  comprasCartaoPj: number;
  comprasAVista: number;
  compras: number;
  sobrou: number;
}

// Corpo de erro do back: { status, mensagem, detalhes, timestamp }
export interface ErroDaApi {
  status: number;
  mensagem: string;
  detalhes: string[];
  timestamp: string;
}
