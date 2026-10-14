import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Info, LucideAngularModule, PiggyBank, Plus, ShieldCheck, TrendingUp, X } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { hoje, mesDe } from '../../../core/datas';
import { lerValor } from '../../../core/dinheiro';
import { MovimentoReserva, NovoMovimento } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';

type Filtro = 'TODAS' | MovimentoReserva['tipo'];
type Finalidade = NonNullable<MovimentoReserva['finalidade']>;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'ENTRADA', texto: 'Entradas' },
  { valor: 'SAIDA', texto: 'Saídas' },
];
const FINALIDADES: { valor: Finalidade; texto: string }[] = [
  { valor: 'EMERGENCIA', texto: 'Emergência' },
  { valor: 'INVESTIMENTO', texto: 'Investimento' },
];

/** Valor com sinal: entrada soma, saída tira. */
function comSinal(m: MovimentoReserva): number {
  return m.tipo === 'ENTRADA' ? m.valor : -m.valor;
}

// RN04: reserva da empresa, com entradas dos fechamentos e saídas pra emergência ou investimento.
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=34-1440
@Component({
  selector: 'app-reserva',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, LucideAngularModule],
  templateUrl: './reserva.html',
  styleUrl: './reserva.scss',
})
export class Reserva {
  private api = inject(ApiService);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly filtros = FILTROS;
  protected readonly finalidades = FINALIDADES;
  protected readonly icones = { Info, PiggyBank, Plus, ShieldCheck, TrendingUp, X };
  protected readonly hoje = hoje();
  protected readonly mesAtual = mesDe(this.hoje);
  protected readonly nomeDoMes = new Date(`${this.mesAtual}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' });
  /** Último dia do mês anterior, pro "Saldo em 30/09". */
  protected readonly fimDoMesAnterior = (() => {
    const [ano, mes] = this.mesAtual.split('-').map(Number);
    return new Date(ano, mes - 1, 0, 12);
  })();

  // Estado da tela
  protected readonly saldo = signal(0);
  protected readonly movimentos = signal<MovimentoReserva[]>([]);
  protected readonly meta = signal<number | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly filtro = signal<Filtro>('TODAS');

  // Modal: "Registrar saída" ou "Guardar valor"
  protected readonly modo = signal<MovimentoReserva['tipo']>('ENTRADA');
  protected readonly salvando = signal(false);
  protected readonly erroModal = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    data: [this.hoje, Validators.required],
    descricao: ['', Validators.required],
    valor: ['', Validators.required],
    finalidade: [null as Finalidade | null],
  });

  /** Movimentos (do mais novo pro mais antigo) com o saldo da reserva logo depois de cada um. */
  protected readonly comSaldo = computed(() => {
    let saldo = 0;
    const doMaisAntigo = [...this.movimentos()].reverse().map((m) => {
      saldo = somar([saldo, comSinal(m)]);
      return { ...m, saldoDepois: saldo };
    });
    return doMaisAntigo.reverse();
  });
  protected readonly lista = computed(() => {
    const filtro = this.filtro();
    return filtro === 'TODAS' ? this.comSaldo() : this.comSaldo().filter((m) => m.tipo === filtro);
  });

  private readonly doMes = computed(() => this.movimentos().filter((m) => mesDe(m.data) === this.mesAtual));
  protected readonly entrouNoMes = computed(() =>
    somar(this.doMes().filter((m) => m.tipo === 'ENTRADA').map((m) => m.valor)),
  );
  protected readonly saiuNoMes = computed(() =>
    somar(this.doMes().filter((m) => m.tipo === 'SAIDA').map((m) => m.valor)),
  );
  protected readonly variacaoDoMes = computed(() => somar([this.entrouNoMes(), -this.saiuNoMes()]));
  protected readonly saldoNoFimDoMesAnterior = computed(() =>
    somar(this.movimentos().filter((m) => mesDe(m.data) < this.mesAtual).map(comSinal)),
  );
  /** Data do último fechamento que mandou dinheiro pra reserva. */
  protected readonly ultimoFechamento = computed(
    () => this.movimentos().find((m) => m.fechamentoDiarioId !== null)?.data ?? null,
  );

  protected readonly percentualDaMeta = computed(() => {
    const meta = this.meta();
    return meta ? Math.min(100, Math.round((this.saldo() / meta) * 100)) : 0;
  });
  protected readonly faltaPraMeta = computed(() => {
    const meta = this.meta();
    return meta ? Math.max(0, somar([meta, -this.saldo()])) : 0;
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({ reserva: this.api.reserva(), config: this.api.configuracao() }).subscribe({
      next: ({ reserva, config }) => {
        this.saldo.set(reserva.saldo);
        this.movimentos.set(reserva.movimentos);
        this.meta.set(config.metaReserva);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected nomeDaFinalidade(finalidade: MovimentoReserva['finalidade']): string {
    return FINALIDADES.find((f) => f.valor === finalidade)?.texto ?? '—';
  }

  // ---- Modal

  protected abrir(modo: MovimentoReserva['tipo']): void {
    this.modo.set(modo);
    this.form.reset({ data: this.hoje, descricao: '', valor: '', finalidade: null });
    // Toda saída precisa dizer pra que foi; entrada não tem finalidade
    this.form.controls.finalidade.setValidators(modo === 'SAIDA' ? Validators.required : null);
    this.form.controls.finalidade.updateValueAndValidity();
    this.erroModal.set(null);
    this.dialogo().nativeElement.showModal();
  }

  protected fecharModal(): void {
    this.dialogo().nativeElement.close();
  }

  protected salvar(): void {
    const v = this.form.getRawValue();
    const valor = lerValor(v.valor);
    const saida = this.modo() === 'SAIDA';
    if (!(valor > 0)) this.form.controls.valor.setErrors({ valor: true });
    else if (saida && valor > this.saldo()) this.form.controls.valor.setErrors({ semSaldo: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const movimento: NovoMovimento = {
      data: v.data,
      tipo: this.modo(),
      finalidade: saida ? v.finalidade : null,
      descricao: v.descricao.trim(),
      valor,
    };

    this.salvando.set(true);
    this.erroModal.set(null);
    this.api.movimentarReserva(movimento).subscribe({
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
}
