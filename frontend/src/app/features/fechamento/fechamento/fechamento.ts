import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banknote, CircleDollarSign, CreditCard, LucideAngularModule, Percent, ShoppingCart, Wallet } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { baixarCsv, numeroCsv } from '../../../core/csv';
import { hoje, mesAnterior, mesDe } from '../../../core/datas';
import { GastoCartao, MaisVendido, ResumoMes } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';
import { baixarRelatorioContadora } from '../relatorio-contadora';

/** Último dia do mês: '2026-10' vira '2026-10-31'. */
function ultimoDia(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  return `${mes}-${new Date(ano, numero, 0).getDate()}`;
}

function nomeDoMes(mes: string): string {
  return new Date(`${mes}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' });
}

/** Quanto `parte` é de `total`, em %. Zero quando não tem total. */
function porcentagem(parte: number, total: number): number {
  return total ? (parte / total) * 100 : 0;
}

// RN08: fechamento do mês, com o relatório da contadora (RN09).
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=35-1655
@Component({
  selector: 'app-fechamento',
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, LucideAngularModule],
  templateUrl: './fechamento.html',
  styleUrl: './fechamento.scss',
})
export class Fechamento {
  private api = inject(ApiService);
  private usuario = inject(AuthService).usuario;

  protected readonly icones = { Banknote, CircleDollarSign, CreditCard, Percent, ShoppingCart, Wallet };
  protected readonly mesAtual = mesDe(hoje());

  // Abre no mês anterior: é o último que já fechou
  protected readonly mes = signal(mesAnterior(this.mesAtual));
  protected readonly resumo = signal<ResumoMes | null>(null);
  protected readonly anterior = signal<ResumoMes | null>(null);
  protected readonly gastos = signal<GastoCartao[]>([]);
  protected readonly produtosVendidos = signal<MaisVendido[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly escolhendoMes = signal(false);
  protected readonly gerandoPlanilha = signal(false);

  protected readonly nomeDoMes = computed(() => nomeDoMes(this.mes()));
  protected readonly nomeDoMesAnterior = computed(() => nomeDoMes(mesAnterior(this.mes())));
  protected readonly mesPorExtenso = computed(() => {
    const nome = this.nomeDoMes();
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${this.mes().slice(0, 4)}`;
  });
  /** O mês fecha quando o seguinte começa: setembro "fechado em 01/10". Null pro mês em andamento. */
  protected readonly fechadoEm = computed(() => {
    if (this.mes() >= this.mesAtual) return null;
    const [ano, mes] = this.mes().split('-').map(Number);
    return new Date(ano, mes, 1, 12);
  });

  // KPIs
  protected readonly percentualRetirada = computed(() => {
    const r = this.resumo();
    return r ? Math.round(porcentagem(r.retiradas, r.vendas)) : 0;
  });
  /** "50/50": quanto da retirada foi salário e quanto foi reserva. */
  protected readonly divisao = computed(() => {
    const r = this.resumo();
    const salario = r ? Math.round(porcentagem(r.salario, r.retiradas)) : 0;
    return `${salario}/${100 - salario}`;
  });
  /** Compras contra o mês anterior, em %. Null quando o anterior não teve compra. */
  protected readonly variacaoCompras = computed(() => {
    const r = this.resumo();
    const a = this.anterior();
    return r && a && a.compras ? porcentagem(r.compras - a.compras, a.compras) : null;
  });
  protected readonly percentualSobrou = computed(() => {
    const r = this.resumo();
    return r ? porcentagem(r.sobrou, r.vendas) : 0;
  });
  protected readonly mediaSalario = computed(() => {
    const r = this.resumo();
    return r && r.diasTrabalhados ? r.salario / r.diasTrabalhados : 0;
  });

  /** "Para onde foi o dinheiro": cada parte em % das vendas. Se gastou mais do que vendeu, a base vira o que saiu. */
  protected readonly destino = computed(() => {
    const r = this.resumo();
    if (!r) return [];
    const base = Math.max(r.vendas, somar([r.compras, r.retiradas]));
    return [
      { chave: 'compras', nome: 'Compras', valor: r.compras },
      { chave: 'salario', nome: 'Salário (pró-labore)', valor: r.salario },
      { chave: 'reserva', nome: 'Reserva da empresa', valor: r.reserva },
      { chave: 'sobrou', nome: 'Sobrou no caixa', valor: r.sobrou },
    ].map((p) => ({ ...p, percentual: porcentagem(p.valor, r.vendas), largura: porcentagem(Math.max(0, p.valor), base) }));
  });

  /** Tabela "Compras por forma de pagamento": cartões primeiro, à vista no fim. */
  protected readonly formas = computed(() => {
    const total = this.resumo()?.compras ?? 0;
    return [...this.gastos()]
      .sort((a, b) => Number(a.formaPagamento === 'A_VISTA') - Number(b.formaPagamento === 'A_VISTA'))
      .map((g) => ({
        ...g,
        nome: g.formaPagamento === 'CARTAO' ? `${g.forma} · final ${g.finalCartao}` : 'À vista',
        percentual: porcentagem(g.total, total),
      }));
  });
  protected readonly quantidadeDeCompras = computed(() => this.gastos().reduce((n, g) => n + g.qtdCompras, 0));

  /** Tabela "Produtos vendidos": o que mais saiu no mês, com a parte de cada um no valor. */
  protected readonly unidadesVendidas = computed(() => this.produtosVendidos().reduce((n, p) => n + p.quantidade, 0));
  protected readonly valorDosProdutos = computed(() => somar(this.produtosVendidos().map((p) => p.total)));
  protected percentualDoProduto(p: MaisVendido): number {
    return porcentagem(p.total, this.valorDosProdutos());
  }

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      resumo: this.api.resumoMensal(this.mes()),
      anterior: this.api.resumoMensal(mesAnterior(this.mes())),
      gastos: this.api.gastosPorCartao(this.mes()),
      produtos: this.api.maisVendidos(`${this.mes()}-01`, ultimoDia(this.mes())),
    }).subscribe({
      next: ({ resumo, anterior, gastos, produtos }) => {
        this.resumo.set(resumo);
        this.anterior.set(anterior);
        this.gastos.set(gastos);
        this.produtosVendidos.set(produtos);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected trocarMes(mes: string): void {
    if (!mes || mes > this.mesAtual) return;
    this.mes.set(mes);
    this.escolhendoMes.set(false);
    this.erro.set(null);
    this.carregar();
  }

  /** "Exportar planilha" do topo: o resumo do mês. */
  protected exportarResumo(): void {
    const r = this.resumo();
    if (!r) return;
    baixarCsv(`fechamento-${this.mes()}.csv`, [
      ['Fechamento do mês', this.mesPorExtenso()],
      ['Dias trabalhados', r.diasTrabalhados],
      ['Vendas', numeroCsv(r.vendas)],
      [`Retiradas (${this.percentualRetirada()}%)`, numeroCsv(r.retiradas)],
      ['Salário (pró-labore)', numeroCsv(r.salario)],
      ['Reserva da empresa', numeroCsv(r.reserva)],
      ['Média de salário por dia', numeroCsv(this.mediaSalario())],
      ['Compras no cartão PJ', numeroCsv(r.comprasCartaoPj)],
      ['Compras à vista', numeroCsv(r.comprasAVista)],
      ['Total de compras', numeroCsv(r.compras)],
      ['Sobrou no caixa', numeroCsv(r.sobrou)],
      [],
      ['Produtos vendidos', 'Quantidade', 'Valor'],
      ...this.produtosVendidos().map((p) => [p.nome, p.quantidade, numeroCsv(p.total)]),
    ]);
  }

  /** "Planilha" do card da contadora: .xlsx formatado com o resumo e cada compra do mês (RN09). */
  protected exportarContadora(): void {
    const resumo = this.resumo();
    if (!resumo || this.gerandoPlanilha()) return;
    this.gerandoPlanilha.set(true);
    this.erro.set(null);
    forkJoin({
      compras: this.api.compras(this.mes()),
      cartoes: this.api.cartoes(),
      categorias: this.api.categorias('COMPRA'),
    }).subscribe({
      next: async ({ compras, cartoes, categorias }) => {
        try {
          await baixarRelatorioContadora({
            mes: this.mes(),
            mesPorExtenso: this.mesPorExtenso(),
            negocio: this.usuario()?.nomeNegocio ?? "Evandro's Grill",
            totais: { cartaoPj: resumo.comprasCartaoPj, aVista: resumo.comprasAVista, compras: resumo.compras },
            gastos: this.gastos(),
            compras,
            cartoes,
            categorias,
          });
        } catch {
          this.erro.set('Não deu pra gerar a planilha. Tente de novo.');
        }
        this.gerandoPlanilha.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.gerandoPlanilha.set(false);
      },
    });
  }
}
