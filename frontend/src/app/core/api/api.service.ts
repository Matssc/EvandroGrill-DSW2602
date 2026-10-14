import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CartaoPj,
  Categoria,
  Compra,
  ComprasResumo,
  Configuracao,
  MaisVendido,
  ErroDaApi,
  FechamentoDiario,
  GastoCartao,
  MovimentoReserva,
  NovaCompra,
  NovaVenda,
  NovoCartao,
  NovoMovimento,
  NovoProduto,
  Produto,
  ProdutoSite,
  Reserva,
  ResumoMes,
  Venda,
} from '../models';
import { somar } from '../regras/caixa';

// Todas as chamadas do painel num lugar só, nas rotas do back (backend/.../controller).
// Três números que as telas usam não têm uma rota própria no back (resumo do mês, gasto por
// cartão e saldo da reserva), então são montados aqui juntando as rotas que existem.
// Os corpos dos POST/PUT levam só os campos que o back espera.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  // Configurações (RN02, RN03, RN04)
  configuracao() {
    return this.http.get<Configuracao>(`${this.url}/configuracao`);
  }
  salvarConfiguracao(c: Configuracao) {
    const corpo: Configuracao = {
      percentualRetirada: c.percentualRetirada,
      dividirRetirada: c.dividirRetirada,
      percentualSalario: c.percentualSalario,
      percentualReserva: c.percentualReserva,
      metaReserva: c.metaReserva,
    };
    return this.http.put<Configuracao>(`${this.url}/configuracao`, corpo);
  }

  // Vendas do dia (RN01)
  vendas(data: string) {
    return this.http.get<Venda[]>(`${this.url}/vendas`, { params: { data } });
  }
  lancarVenda(venda: NovaVenda) {
    return this.http.post<Venda>(`${this.url}/vendas`, corpoDaVenda(venda));
  }
  editarVenda(id: number, venda: NovaVenda) {
    return this.http.put<Venda>(`${this.url}/vendas/${id}`, corpoDaVenda(venda));
  }
  excluirVenda(id: number) {
    return this.http.delete<void>(`${this.url}/vendas/${id}`);
  }
  /** Ranking dos produtos entre duas datas ('2026-10-01' a '2026-10-31'). */
  maisVendidos(inicio: string, fim: string) {
    return this.http.get<MaisVendido[]>(`${this.url}/vendas/mais-vendidos`, {
      params: { inicio, fim },
    });
  }

  // Fechamento do dia e dias trabalhados (RN02, RN03, RN05)
  fechamentos(mes: string) {
    return this.http.get<FechamentoDiario[]>(`${this.url}/fechamentos`, { params: { mes } });
  }
  fecharDia(data: string) {
    return this.http.post<FechamentoDiario>(`${this.url}/fechamentos`, { data });
  }

  // Fechamento do mês (RN08): fechamentos do mês + resumo das compras do mês
  resumoMensal(mes: string) {
    return forkJoin({ dias: this.fechamentos(mes), compras: this.resumoDasCompras(mes) }).pipe(
      map(({ dias, compras }) => resumirMes(mes, dias, compras)),
    );
  }

  // Reserva da empresa (RN04). O back manda do mais novo pro mais antigo,
  // cada um com o saldo logo depois dele: o saldo de agora é o do primeiro.
  reserva() {
    return this.http
      .get<MovimentoReserva[]>(`${this.url}/reserva/movimentos`)
      .pipe(map((movimentos): Reserva => ({ saldo: movimentos[0]?.saldoApos ?? 0, movimentos })));
  }
  movimentarReserva(m: NovoMovimento) {
    const corpo: NovoMovimento = {
      data: m.data,
      tipo: m.tipo,
      finalidade: m.finalidade,
      descricao: m.descricao,
      valor: m.valor,
    };
    return this.http.post<MovimentoReserva>(`${this.url}/reserva/movimentos`, corpo);
  }

  // Compras (RN06)
  compras(mes: string) {
    return this.http.get<Compra[]>(`${this.url}/compras`, { params: { mes } });
  }
  resumoDasCompras(mes: string) {
    return this.http.get<ComprasResumo>(`${this.url}/compras/resumo`, { params: { mes } });
  }
  salvarCompra(compra: NovaCompra, id?: number) {
    const corpo = corpoDaCompra(compra);
    return id
      ? this.http.put<Compra>(`${this.url}/compras/${id}`, corpo)
      : this.http.post<Compra>(`${this.url}/compras`, corpo);
  }
  excluirCompra(id: number) {
    return this.http.delete<void>(`${this.url}/compras/${id}`);
  }
  categorias(tipo: Categoria['tipo']) {
    return this.http.get<Categoria[]>(`${this.url}/categorias`, { params: { tipo } });
  }

  // Cartões PJ (RN07) e relatório da contadora (RN09)
  cartoes() {
    return this.http.get<CartaoPj[]>(`${this.url}/cartoes`);
  }
  salvarCartao(cartao: NovoCartao, id?: number) {
    const corpo = corpoDoCartao(cartao);
    return id
      ? this.http.put<CartaoPj>(`${this.url}/cartoes/${id}`, corpo)
      : this.http.post<CartaoPj>(`${this.url}/cartoes`, corpo);
  }
  gastosPorCartao(mes: string) {
    return this.resumoDasCompras(mes).pipe(map(gastosDoResumo));
  }

  // Produtos do site
  produtosDoSite() {
    return this.http.get<ProdutoSite[]>(`${this.url}/publico/cardapio`);
  }
  produtos() {
    return this.http.get<Produto[]>(`${this.url}/produtos`);
  }
  salvarProduto(produto: NovoProduto, id?: number) {
    const corpo = corpoDoProduto(produto);
    return id
      ? this.http.put<Produto>(`${this.url}/produtos/${id}`, corpo)
      : this.http.post<Produto>(`${this.url}/produtos`, corpo);
  }
  excluirProduto(id: number) {
    return this.http.delete<void>(`${this.url}/produtos/${id}`);
  }
}

// ---------------------------------------------------------------------------
// Corpos das requisições: exatamente os campos dos *Request do back

function corpoDaVenda(v: NovaVenda): NovaVenda {
  const { data, hora, tipoLancamento, origem, formaPagamento, valor } = v;
  const itens = v.itens.map(({ produtoId, quantidade }) => ({ produtoId, quantidade }));
  return { data, hora, tipoLancamento, origem, formaPagamento, valor, itens };
}

function corpoDaCompra(c: NovaCompra): NovaCompra {
  const { data, descricao, valor, formaPagamento, meioAVista, cartaoPjId, categoriaId } = c;
  return { data, descricao, valor, formaPagamento, meioAVista, cartaoPjId, categoriaId };
}

function corpoDoCartao(c: NovoCartao): NovoCartao {
  const { apelido, bandeira, finalCartao, diaFechamento, diaVencimento, ativo } = c;
  return { apelido, bandeira, finalCartao, diaFechamento, diaVencimento, ativo };
}

function corpoDoProduto(p: NovoProduto): NovoProduto {
  const { codigo, nome, descricao, preco, fotoUrl, mostrarNoSite, destaque, categoriaId } = p;
  return { codigo, nome, descricao, preco, fotoUrl, mostrarNoSite, destaque, categoriaId };
}

// ---------------------------------------------------------------------------
// Números montados a partir das rotas do back

/** Uma linha por cartão usado no mês e, se teve compra à vista, uma pra "À vista". */
export function gastosDoResumo(r: ComprasResumo): GastoCartao[] {
  const gastos = r.cartoes.map((c): GastoCartao => ({
    formaPagamento: 'CARTAO',
    cartaoPjId: c.cartaoId,
    forma: c.apelido,
    finalCartao: c.finalCartao,
    qtdCompras: c.quantidade,
    total: c.total,
  }));
  if (r.aVista.quantidade > 0) {
    gastos.push({
      formaPagamento: 'A_VISTA',
      cartaoPjId: null,
      forma: 'À vista',
      finalCartao: null,
      qtdCompras: r.aVista.quantidade,
      total: r.aVista.total,
    });
  }
  return gastos;
}

/** Fechamento do mês (RN08). O que sobrou = vendas - retiradas - compras. */
export function resumirMes(
  mes: string,
  dias: FechamentoDiario[],
  compras: ComprasResumo,
): ResumoMes {
  const vendas = somar(dias.map((f) => f.totalVendido));
  const retiradas = somar(dias.map((f) => f.valorRetirada));
  return {
    mes,
    diasTrabalhados: dias.length,
    vendas,
    retiradas,
    salario: somar(dias.map((f) => f.valorSalario)),
    reserva: somar(dias.map((f) => f.valorReserva)),
    comprasCartaoPj: compras.totalNoCartao,
    comprasAVista: compras.aVista.total,
    compras: compras.total,
    sobrou: somar([vendas, -retiradas, -compras.total]),
  };
}

// ---------------------------------------------------------------------------

/** Texto pra mostrar na tela quando uma chamada falha. O back manda { mensagem, detalhes }. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) return 'Sem conexão com o servidor. Confira se o back está rodando.';

    const corpo =
      typeof erro.error === 'object' && erro.error !== null
        ? (erro.error as Partial<ErroDaApi>)
        : null;
    if (typeof corpo?.mensagem === 'string') {
      // Erro de validação: mensagem "Dados inválidos" e o motivo em detalhes ("valor: O valor deve ser...")
      const detalhe = corpo.detalhes?.[0];
      if (!detalhe) return corpo.mensagem;
      const separador = detalhe.indexOf(': ');
      return separador >= 0 ? detalhe.slice(separador + 2) : detalhe;
    }

    if (erro.status === 401) return 'Sua sessão acabou. Entre de novo.';
    if (erro.status === 404)
      return 'O back não tem essa rota (404). Confira se ele está atualizado.';
    // Proxy do ng serve ou nginx sem resposta do back: 500/502/504 sem o JSON de erro do Spring
    if (erro.status >= 502 || (erro.status === 500 && !corpo)) {
      return 'O back não respondeu. Confira se ele está rodando na porta 8080.';
    }
    if (erro.status >= 500) return 'Erro no back. Veja o terminal dele pra saber o que foi.';
  }
  return 'Algo deu errado. Tente de novo.';
}
