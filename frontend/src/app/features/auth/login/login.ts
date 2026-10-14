import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChevronLeft, LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { mensagemDeErro } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PainelMarca } from '../painel-marca/painel-marca';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, PainelMarca],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Pra onde voltar depois de entrar: o authGuard manda ?voltar=/admin/... */
  readonly voltar = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
    lembrar: [true],
  });
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly apiFalsa = environment.useMock;
  protected readonly ChevronLeft = ChevronLeft;

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, senha, lembrar } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.auth.entrar({ email, senha }, lembrar).subscribe({
      next: () => {
        const destino = this.voltar()?.startsWith('/admin') ? this.voltar()! : '/admin/dashboard';
        this.router.navigateByUrl(destino);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.enviando.set(false);
      },
    });
  }
}