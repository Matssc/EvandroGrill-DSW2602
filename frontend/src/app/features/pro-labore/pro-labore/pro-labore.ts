import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Banknote, CalendarCheck, Calculator, Info, LucideAngularModule, Percent, TriangleAlert } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { baixarCsv, numeroCsv } from '../../../core/csv';
import { hoje, mesAnterior, mesDe } from '../../../core/datas';
import { FechamentoDiario, ResumoMes } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** fechado: caixa fechado · aberto: hoje, ainda sem fechar · folga: dia que passou sem fechar · futuro: ainda não chegou */
type EstadoDoDia = 'fechado' | 'aberto' | 'folga' | 'futuro';

interface Dia {
  data: string;
  numero: string; // '01'
  semana: string; // 'qui'
  estado: EstadoDoDia;
  fechamento: FechamentoDiario | null;
}

function nomeDoMes(mes: string): string {
  return new Date(`${mes}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' });
}

// RN05: cada dia fechado conta como dia trabalhado, e o salário sai da retirada de cada um.
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=34-963
@Component({
  selector: 'app-pro-labore',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, LucideAngularModule],
  templateUrl: './pro-labore.html',
  styleUrl: './pro-labore.scss',
})
export class ProLabore {
  private api = inject(ApiService);

  protected readonly semana = SEMANA;
  protected readonly icones = { Banknote, CalendarCheck, Calculator, Info, Percent, TriangleAlert };
  protected readonly hoje = hoje();
  protected readonly ontem = (() => {
    const [ano, mes, dia] = this.hoje.split('-').map(Number);
    return new Date(ano, mes - 1, dia - 1, 12);
  })();
  protected readonly mesAtual = mesDe(this.hoje);

  // Estado da tela
  protected readonly mes = signal(this.mesAtual);
  protected readonly fechamentos = signal<FechamentoDiario[]>([]);
  protected readonly resumo = signal<ResumoMes | null>(null);
  protected readonly resumoAnterior = signal<ResumoMes | null>(null);
  protected readonly vendidoHoje = signal(0);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly escolhendoMes = signal(false);

  protected readonly nomeDoMes = computed(() => nomeDoMes(this.mes()));
  protected readonly nomeDoMesAnterior = computed(() => nomeDoMes(mesAnterior(this.mes())));
  protected readonly mesPorExtenso = computed(() => {
    const nome = this.nomeDoMes();
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${this.mes().slice(0, 4)}`;
  });

  /** Todos os dias do mês, com o estado de cada um. */
  protected readonly dias = computed<Dia[]>(() => {
    const [ano, mes] = this.mes().split('-').map(Number);
    const total = new Date(ano, mes, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const numero = String(i + 1).padStart(2, '0');
      const data = `${this.mes()}-${numero}`;
      const fechamento = this.fechamentos().find((f) => f.data === data) ?? null;
      const semana = new Date(ano, mes - 1, i + 1, 12).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      let estado: EstadoDoDia = 'futuro';
      if (fechamento) estado = 'fechado';
      else if (data === this.hoje) estado = 'aberto';
      else if (data < this.hoje) estado = 'folga';
      return { data, numero, semana, estado, fechamento };
    });
  });
  /** Casas vazias antes do dia 1 pra ele cair no dia da semana certo. */
  protected readonly vazios = computed(() => {
    const [ano, mes] = this.mes().split('-').map(Number);
    return Array.from({ length: new Date(ano, mes - 1, 1).getDay() });
  });
  /** Tabela: do dia 1 até hoje (ou o mês inteiro, se ele já passou). */
  protected readonly linhas = computed(() => this.dias().filter((d) => d.estado !== 'futuro'));
  protected readonly folgas = computed(() => this.dias().filter((d) => d.estado === 'folga').length);
  protected readonly ehMesAtual = computed(() => this.mes() === this.mesAtual);
  protected readonly hojeEmAberto = computed(() => this.dias().some((d) => d.estado === 'aberto'));

  // KPIs
  protected readonly percentualSalario = computed(() => {
    const r = this.resumo();
    return r && r.retiradas ? Math.round((r.salario / r.retiradas) * 100) : 0;
  });
  protected readonly percentualRetirada = computed(() => {
    const r = this.resumo();
    return r && r.vendas ? Math.round((r.retiradas / r.vendas) * 100) : 0;
  });
  protected readonly mediaPorDia = computed(() => {
    const r = this.resumo();
    return r && r.diasTrabalhados ? r.salario / r.diasTrabalhados : 0;
  });
  /** Variação da média contra o mês anterior. Null quando o anterior não teve dia trabalhado. */
  protected readonly variacaoDaMedia = computed(() => {
    const a = this.resumoAnterior();
    if (!a || !a.diasTrabalhados || !this.resumo()?.diasTrabalhados) return null;
    const anterior = a.salario / a.diasTrabalhados;
    return Math.round(((this.mediaPorDia() - anterior) / anterior) * 100);
  });

  /** "30% de cada dia fechado vira retirada, e metade dela é sua", com os percentuais do último fechamento. */
  protected readonly regraDoSalario = computed(() => {
    const ultimo = this.fechamentos().at(-1);
    if (!ultimo) return 'Cada dia fechado vira retirada, e parte dela é o seu salário';
    const parte =
      ultimo.percentualSalario === 100 ? 'ela toda é sua'
      : ultimo.percentualSalario === 50 ? 'metade dela é sua'
      : `${ultimo.percentualSalario}% dela é seu`;
    return `${ultimo.percentualRetirada}% de cada dia fechado vira retirada, e ${parte}`;
  });
  protected readonly exemplo = computed(() => this.fechamentos()[0] ?? null);

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      fechamentos: this.api.fechamentos(this.mes()),
      resumo: this.api.resumoMensal(this.mes()),
      anterior: this.api.resumoMensal(mesAnterior(this.mes())),
      vendasDeHoje: this.api.vendas(this.hoje),
    }).subscribe({
      next: ({ fechamentos, resumo, anterior, vendasDeHoje }) => {
        this.fechamentos.set([...fechamentos].sort((a, b) => a.data.localeCompare(b.data)));
        this.resumo.set(resumo);
        this.resumoAnterior.set(anterior);
        this.vendidoHoje.set(somar(vendasDeHoje.map((v) => v.valor)));
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

  /** Baixa a tabela "Retiradas por dia" em CSV. */
  protected exportar(): void {
    const linhas = [['Dia', 'Situação', 'Vendido', 'Retirada', 'Salário', 'Reserva']];
    for (const d of this.linhas()) {
      const f = d.fechamento;
      const situacao = f ? 'Fechado' : d.estado === 'aberto' ? 'Em aberto' : 'Folga';
      linhas.push([
        `${d.numero}/${this.mes().slice(5)}/${this.mes().slice(0, 4)}`,
        situacao,
        f ? numeroCsv(f.totalVendido) : '',
        f ? numeroCsv(f.valorRetirada) : '',
        f ? numeroCsv(f.valorSalario) : '',
        f ? numeroCsv(f.valorReserva) : '',
      ]);
    }
    const r = this.resumo();
    if (r) {
      linhas.push([`${r.diasTrabalhados} dias`, 'Total', numeroCsv(r.vendas), numeroCsv(r.retiradas), numeroCsv(r.salario), numeroCsv(r.reserva)]);
    }
    baixarCsv(`pro-labore-${this.mes()}.csv`, linhas);
  }
}
