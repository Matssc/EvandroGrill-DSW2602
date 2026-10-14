import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Check, CircleDollarSign, Info, LucideAngularModule, Percent, Plus, ShoppingCart, Wallet } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { hoje, mesDe } from '../../../core/datas';
import { Configuracao, FechamentoDiario, GastoCartao, MaisVendido, Reserva, ResumoMes, Venda } from '../../../core/models';
import { calcularFechamento, somar } from '../../../core/regras/caixa';
import { MaisVendidos } from '../../../shared/mais-vendidos/mais-vendidos';
import { DiaDoMes, VendasPorDia } from '../vendas-por-dia/vendas-por-dia';

// RN08: visão geral do mês e do dia.
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=33-1628
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CurrencyPipe, DatePipe, LucideAngularModule, VendasPorDia, MaisVendidos],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private api = inject(ApiService);

  protected readonly icones = { Check, CircleDollarSign, Info, Percent, Plus, ShoppingCart, Wallet };
  protected readonly hoje = hoje();
  protected readonly mes = mesDe(this.hoje);
  protected readonly nomeDoMes = new Date(`${this.mes}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' });
  protected readonly mesPorExtenso = `${this.nomeDoMes[0].toUpperCase()}${this.nomeDoMes.slice(1)} de ${this.mes.slice(0, 4)}`;
  protected readonly diaDaSemana = (() => {
    const [ano, mes, dia] = this.hoje.split('-').map(Number);
    const nome = new Date(ano, mes - 1, dia, 12).toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${nome[0].toUpperCase()}${nome.slice(1)}`;
  })();

  // Estado da tela
  protected readonly resumo = signal<ResumoMes | null>(null);
  protected readonly fechamentos = signal<FechamentoDiario[]>([]);
  protected readonly vendasDeHoje = signal<Venda[]>([]);
  protected readonly config = signal<Configuracao | null>(null);
  protected readonly reserva = signal<Reserva | null>(null);
  protected readonly gastos = signal<GastoCartao[]>([]);
  protected readonly maisVendidos = signal<MaisVendido[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  // KPIs: Vendeu − Gastou − Retirou = Sobrou
  protected readonly quantidadeDeCompras = computed(() => this.gastos().reduce((n, g) => n + g.qtdCompras, 0));
  protected readonly percentualRetirada = computed(() => {
    const r = this.resumo();
    return r && r.vendas ? Math.round((r.retiradas / r.vendas) * 100) : (this.config()?.percentualRetirada ?? 0);
  });
  protected readonly percentualSobrou = computed(() => {
    const r = this.resumo();
    return r && r.vendas ? Math.round((r.sobrou / r.vendas) * 100) : 0;
  });

  // Dias do mês até hoje (gráfico de vendas e chips do pró-labore)
  protected readonly dias = computed<DiaDoMes[]>(() => {
    const total = Number(this.hoje.slice(8));
    return Array.from({ length: total }, (_, i) => {
      const numero = String(i + 1).padStart(2, '0');
      const data = `${this.mes}-${numero}`;
      const fechamento = this.fechamentos().find((f) => f.data === data);
      if (fechamento) return { data, numero, estado: 'fechado', vendido: fechamento.totalVendido };
      if (data === this.hoje) return { data, numero, estado: 'aberto', vendido: this.vendidoHoje() };
      return { data, numero, estado: 'folga', vendido: 0 };
    });
  });

  // Card "Hoje"
  protected readonly fechamentoDeHoje = computed(() => this.fechamentos().find((f) => f.data === this.hoje) ?? null);
  protected readonly vendidoHoje = computed(() => somar(this.vendasDeHoje().map((v) => v.valor)));
  protected readonly vendasLancadas = computed(() => this.vendasDeHoje().filter((v) => v.tipoLancamento === 'POR_VENDA').length);
  /** Dia aberto: prévia com a configuração atual. Dia fechado: o que ficou gravado no fechamento. */
  protected readonly previa = computed(() => {
    const fechado = this.fechamentoDeHoje();
    if (fechado) {
      return {
        retirada: fechado.valorRetirada,
        salario: fechado.valorSalario,
        reserva: fechado.valorReserva,
        percentualRetirada: fechado.percentualRetirada,
        percentualSalario: fechado.percentualSalario,
      };
    }
    const config = this.config();
    if (!config) return null;
    return {
      ...calcularFechamento(this.vendidoHoje(), config),
      percentualRetirada: config.percentualRetirada,
      percentualSalario: config.dividirRetirada ? config.percentualSalario : 100,
    };
  });

  // Card "Reserva da empresa"
  protected readonly entrouNaReserva = computed(() =>
    somar(
      (this.reserva()?.movimentos ?? [])
        .filter((m) => m.tipo === 'ENTRADA' && mesDe(m.data) === this.mes)
        .map((m) => m.valor),
    ),
  );
  protected readonly percentualDaMeta = computed(() => {
    const meta = this.config()?.metaReserva;
    return meta ? Math.min(100, Math.round(((this.reserva()?.saldo ?? 0) / meta) * 100)) : 0;
  });
  /** "Metade de cada retirada vem pra cá", com o percentual da configuração. */
  protected readonly regraDaReserva = computed(() => {
    const c = this.config();
    if (!c) return '';
    if (!c.dividirRetirada || c.percentualReserva === 0) return 'A divisão da retirada está desligada: por enquanto nada entra na reserva sozinho.';
    const parte = c.percentualReserva === 50 ? 'Metade' : `${c.percentualReserva}%`;
    return `${parte} de cada retirada vem pra cá: dinheiro da empresa, separado do seu.`;
  });

  // Card "Pró-labore"
  protected readonly mediaSalario = computed(() => {
    const r = this.resumo();
    return r && r.diasTrabalhados ? r.salario / r.diasTrabalhados : 0;
  });

  // Card "Compras do mês": cartões primeiro, à vista no fim, barra em % do total
  protected readonly formas = computed(() => {
    const total = this.resumo()?.compras ?? 0;
    return [...this.gastos()]
      .sort((a, b) => Number(a.formaPagamento === 'A_VISTA') - Number(b.formaPagamento === 'A_VISTA'))
      .map((g, i) => ({
        ...g,
        detalhe: `${g.formaPagamento === 'CARTAO' ? `final ${g.finalCartao}` : 'fora do cartão'} · ${g.qtdCompras} ${g.qtdCompras === 1 ? 'compra' : 'compras'}`,
        cor: g.formaPagamento === 'A_VISTA' ? 'a-vista' : i % 2 === 0 ? 'cartao' : 'cartao-2',
        largura: total ? (g.total / total) * 100 : 0,
      }));
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      resumo: this.api.resumoMensal(this.mes),
      fechamentos: this.api.fechamentos(this.mes),
      vendas: this.api.vendas(this.hoje),
      config: this.api.configuracao(),
      reserva: this.api.reserva(),
      gastos: this.api.gastosPorCartao(this.mes),
      maisVendidos: this.api.maisVendidos(`${this.mes}-01`, this.hoje),
    }).subscribe({
      next: ({ resumo, fechamentos, vendas, config, reserva, gastos, maisVendidos }) => {
        this.resumo.set(resumo);
        this.fechamentos.set(fechamentos);
        this.vendasDeHoje.set(vendas);
        this.config.set(config);
        this.reserva.set(reserva);
        this.gastos.set(gastos);
        this.maisVendidos.set(maisVendidos);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }
}
