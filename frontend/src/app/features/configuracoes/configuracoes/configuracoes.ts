import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CreditCard, LucideAngularModule, Mail, ShieldCheck } from 'lucide-angular';
import { forkJoin, map } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { emReais, lerValor } from '../../../core/dinheiro';
import { CartaoPj, Configuracao } from '../../../core/models';
import { RegrasCaixa, calcularFechamento } from '../../../core/regras/caixa';

const ATALHOS = [20, 25, 30, 35];
const VENDA_SIMULADA = 666.67;

/** Percentual digitado pra conta da simulação: vazio ou fora da faixa vira 0 a 100. */
function percentual(valor: number | null): number {
  return Math.min(100, Math.max(0, Number(valor) || 0));
}

// RN02 (retirada), RN03 (divisão) e RN04 (reserva da empresa).
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=35-2167
@Component({
  selector: 'app-configuracoes',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, LucideAngularModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.scss',
})
export class Configuracoes {
  private api = inject(ApiService);

  protected readonly atalhos = ATALHOS;
  protected readonly vendaSimulada = VENDA_SIMULADA;
  protected readonly icones = { CreditCard, Mail, ShieldCheck };
  protected readonly usuario = inject(AuthService).usuario;

  // Estado da tela
  protected readonly cartoes = signal<CartaoPj[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregou = signal(false); // sem a configuração do back, não salva os valores padrão por cima
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    percentualRetirada: [30 as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    dividirRetirada: [false],
    percentualSalario: [50 as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    percentualReserva: [50 as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    metaReserva: [''],
  });

  // Valores do formulário como signal, pra simulação acompanhar enquanto digita
  private readonly valores = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly regras = computed<RegrasCaixa>(() => {
    const v = this.valores();
    return {
      percentualRetirada: percentual(v.percentualRetirada),
      dividirRetirada: v.dividirRetirada,
      percentualSalario: v.dividirRetirada ? percentual(v.percentualSalario) : 100,
    };
  });
  protected readonly simulacao = computed(() => calcularFechamento(VENDA_SIMULADA, this.regras()));

  constructor() {
    const { percentualSalario, percentualReserva } = this.form.controls;
    // Salário + reserva = 100: mudou um, o outro acompanha
    percentualSalario.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      percentualReserva.setValue(100 - percentual(v), { emitEvent: false });
    });
    percentualReserva.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      percentualSalario.setValue(100 - percentual(v), { emitEvent: false });
    });
    // Mexeu de novo: o "Alterações salvas" some
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.salvo.set(false));

    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({ config: this.api.configuracao(), cartoes: this.api.cartoes() }).subscribe({
      next: ({ config, cartoes }) => {
        this.preencher(config);
        this.cartoes.set(cartoes);
        this.carregou.set(true);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected escolherRetirada(valor: number): void {
    this.form.controls.percentualRetirada.setValue(valor);
  }

  protected detalheDoCartao(cartao: CartaoPj): string {
    const partes = [cartao.bandeira, cartao.diaFechamento ? `fecha dia ${cartao.diaFechamento}` : null];
    return partes.filter(Boolean).join(' · ');
  }

  protected salvar(): void {
    const v = this.form.getRawValue();
    const meta = v.metaReserva.trim() ? lerValor(v.metaReserva) : null;
    if (meta !== null && !(meta >= 0)) {
      this.form.controls.metaReserva.setErrors({ valor: true });
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const config: Configuracao = {
      percentualRetirada: v.percentualRetirada!,
      dividirRetirada: v.dividirRetirada,
      percentualSalario: v.percentualSalario!,
      percentualReserva: 100 - v.percentualSalario!,
      metaReserva: meta,
    };

    this.salvando.set(true);
    this.erro.set(null);
    this.api.salvarConfiguracao(config).subscribe({
      next: (salva) => {
        this.preencher(salva);
        this.salvando.set(false);
        this.salvo.set(true);
      },
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  private preencher(config: Configuracao): void {
    // Com a divisão desligada o back guarda 100/0 (toda a retirada vira salário).
    // A tela mostra 50/50, que é a sugestão se a divisão for ligada de novo.
    const semDivisao = !config.dividirRetirada;
    this.form.setValue({
      percentualRetirada: config.percentualRetirada,
      dividirRetirada: config.dividirRetirada,
      percentualSalario: semDivisao ? 50 : config.percentualSalario,
      percentualReserva: semDivisao ? 50 : config.percentualReserva,
      metaReserva: config.metaReserva === null ? '' : emReais(config.metaReserva),
    });
  }
}
