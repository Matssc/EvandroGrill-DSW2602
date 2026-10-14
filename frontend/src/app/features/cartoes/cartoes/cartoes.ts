import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Banknote, CreditCard, Info, LucideAngularModule, Plus, TriangleAlert, X } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { hoje, mesAnterior, mesDe } from '../../../core/datas';
import { CartaoPj, GastoCartao, NovoCartao } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';

const BANDEIRAS = ['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard'];
const DIAS_PRA_AVISAR = 3; // fatura fechando em 3 dias ou menos: badge âmbar e aviso amarelo
const UM_DIA = 24 * 60 * 60 * 1000;

/** '2026-10-08' vira Date ao meio-dia, pra conta de dias não sofrer com fuso e horário de verão. */
function dataLocal(texto: string): Date {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

/** Dia X do mês, sem passar do último dia (dia 31 em novembro vira 30). */
function diaNoMes(ano: number, mes: number, dia: number): Date {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimo), 12);
}

/** Próximo fechamento a partir de hoje (hoje conta) e o vencimento que vem depois dele. */
function proximaFatura(cartao: CartaoPj, hojeData: Date) {
  const ano = hojeData.getFullYear();
  const mes = hojeData.getMonth();
  let fecha = diaNoMes(ano, mes, cartao.diaFechamento!);
  if (fecha < hojeData) fecha = diaNoMes(ano, mes + 1, cartao.diaFechamento!);
  let vence: Date | null = null;
  if (cartao.diaVencimento) {
    vence = diaNoMes(fecha.getFullYear(), fecha.getMonth(), cartao.diaVencimento);
    if (vence <= fecha) vence = diaNoMes(fecha.getFullYear(), fecha.getMonth() + 1, cartao.diaVencimento);
  }
  return { fecha, vence, dias: Math.round((fecha.getTime() - hojeData.getTime()) / UM_DIA) };
}

function nomeDoMes(mes: string): string {
  return new Date(`${mes}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' });
}

function doisDigitos(n: number | null): string {
  return String(n ?? '').padStart(2, '0');
}

// RN07: cartões PJ, quanto saiu em cada um e quando fecham as faturas.
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=35-1407
@Component({
  selector: 'app-cartoes',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, LucideAngularModule],
  templateUrl: './cartoes.html',
  styleUrl: './cartoes.scss',
})
export class Cartoes {
  private api = inject(ApiService);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly bandeiras = BANDEIRAS;
  protected readonly icones = { Banknote, CreditCard, Info, Plus, TriangleAlert, X };
  protected readonly hoje = hoje();
  protected readonly diasPraAvisar = DIAS_PRA_AVISAR;

  /** Do mais antigo pro atual: ['2026-08', '2026-09', '2026-10']. */
  protected readonly meses = (() => {
    const atual = mesDe(this.hoje);
    const anterior = mesAnterior(atual);
    return [mesAnterior(anterior), anterior, atual];
  })();
  protected readonly mesAtual = this.meses[2];
  protected readonly nomeDoMesAtual = nomeDoMes(this.mesAtual);
  protected readonly mesPorExtenso = (() => {
    const nome = this.nomeDoMesAtual;
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${this.mesAtual.slice(0, 4)}`;
  })();
  protected readonly colunas = this.meses.map((mes) => {
    const nome = nomeDoMes(mes);
    return { mes, titulo: `${nome[0].toUpperCase()}${nome.slice(1)}`, atual: mes === this.mesAtual };
  });

  // Estado da tela
  protected readonly cartoes = signal<CartaoPj[]>([]);
  /** Gastos de cada mês, na mesma ordem de `meses`. */
  protected readonly gastos = signal<GastoCartao[][]>([[], [], []]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  // Modal Adicionar / Editar cartão
  protected readonly editando = signal<CartaoPj | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroModal = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    apelido: ['', Validators.required],
    bandeira: [''],
    finalCartao: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    diaFechamento: [null as number | null, [Validators.min(1), Validators.max(31)]],
    diaVencimento: [null as number | null, [Validators.min(1), Validators.max(31)]],
    ativo: [true],
  });

  /** Gasto do cartão (ou à vista, com id null) em cada um dos 3 meses. */
  private porMes(cartaoPjId: number | null): number[] {
    return this.gastos().map((doMes) =>
      somar(doMes.filter((g) => g.cartaoPjId === cartaoPjId).map((g) => g.total)),
    );
  }

  /** Cards do topo, um por cartão, com o gasto lançado no mês atual. */
  protected readonly cards = computed(() =>
    this.cartoes().map((cartao, i) => ({
      cartao,
      grafite: i % 2 === 1,
      lancado: this.porMes(cartao.id)[2],
      ciclo: [
        cartao.diaFechamento ? `Fecha dia ${doisDigitos(cartao.diaFechamento)}` : null,
        cartao.diaVencimento ? `vence dia ${doisDigitos(cartao.diaVencimento)}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  );

  /** Tabela dos 3 meses: os cartões ativos e os que tiveram gasto em algum dos meses. */
  protected readonly tabela = computed(() => {
    const linhas = this.cartoes()
      .map((cartao) => ({ cartao, valores: this.porMes(cartao.id) }))
      .filter((l) => l.cartao.ativo || l.valores.some((v) => v > 0));
    const noCartao = [0, 1, 2].map((i) => somar(linhas.map((l) => l.valores[i])));
    const aVista = this.porMes(null);
    return { linhas, noCartao, aVista, total: [0, 1, 2].map((i) => somar([noCartao[i], aVista[i]])) };
  });

  /** Ciclo das faturas: só cartões ativos com dia de fechamento, do que fecha antes pro que fecha depois. */
  protected readonly ciclos = computed(() => {
    const hojeData = dataLocal(this.hoje);
    return this.cartoes()
      .filter((k) => k.ativo && k.diaFechamento)
      .map((cartao) => ({ cartao, ...proximaFatura(cartao, hojeData) }))
      .sort((a, b) => a.dias - b.dias);
  });
  protected readonly fechandoLogo = computed(() => this.ciclos().filter((c) => c.dias <= DIAS_PRA_AVISAR));

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      cartoes: this.api.cartoes(),
      gastos: forkJoin(this.meses.map((mes) => this.api.gastosPorCartao(mes))),
    }).subscribe({
      next: ({ cartoes, gastos }) => {
        this.cartoes.set(cartoes);
        this.gastos.set(gastos);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected quandoFecha(dias: number): string {
    if (dias === 0) return 'Fecha hoje';
    if (dias === 1) return 'Fecha amanhã';
    return `Fecha em ${dias} dias`;
  }

  // ---- Modal

  protected novoCartao(): void {
    this.editando.set(null);
    this.form.reset({ apelido: '', bandeira: '', finalCartao: '', diaFechamento: null, diaVencimento: null, ativo: true });
    this.abrirModal();
  }

  protected editar(cartao: CartaoPj): void {
    this.editando.set(cartao);
    this.form.reset({
      apelido: cartao.apelido,
      bandeira: cartao.bandeira ?? '',
      finalCartao: cartao.finalCartao,
      diaFechamento: cartao.diaFechamento,
      diaVencimento: cartao.diaVencimento,
      ativo: cartao.ativo,
    });
    this.abrirModal();
  }

  protected fecharModal(): void {
    this.dialogo().nativeElement.close();
  }

  protected aoFecharModal(): void {
    this.editando.set(null);
    this.erroModal.set(null);
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const cartao: NovoCartao = {
      apelido: v.apelido.trim(),
      bandeira: v.bandeira.trim() || null,
      finalCartao: v.finalCartao,
      diaFechamento: v.diaFechamento || null,
      diaVencimento: v.diaVencimento || null,
      ativo: v.ativo,
    };

    this.salvando.set(true);
    this.erroModal.set(null);
    this.api.salvarCartao(cartao, this.editando()?.id).subscribe({
      next: () => {
        this.salvando.set(false);
        this.fecharModal();
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.erroModal.set(mensagemDeErro(e));
      },
    });
  }

  private abrirModal(): void {
    this.erroModal.set(null);
    this.dialogo().nativeElement.showModal();
  }
}
