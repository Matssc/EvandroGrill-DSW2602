import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DadosLogin, Sessao } from '../models';

const CHAVE = 'grill.sessao';

// RN10: guarda o token de quem entrou. Toda chamada leva esse token (auth.interceptor.ts),
// e o back só devolve os dados do dono do token.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private sessao = signal<Sessao | null>(lerSessao());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly logado = computed(() => this.sessao() !== null);

  token(): string | null {
    return this.sessao()?.token ?? null;
  }

  /** "Lembrar de mim" desligado: a sessão acaba quando o navegador fecha. */
  entrar(dados: DadosLogin, lembrar = true) {
    return this.http
      .post<Sessao>(`${environment.apiUrl}/auth/login`, dados)
      .pipe(tap((sessao) => this.guardar(sessao, lembrar)));
  }

  sair(): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(CHAVE);
      sessionStorage.removeItem(CHAVE);
    } catch {
      // navegador bloqueando o storage: não tem o que limpar
    }
    this.router.navigate(['/admin/login']);
  }

  private guardar(sessao: Sessao, lembrar: boolean): void {
    this.sessao.set(sessao);
    try {
      (lembrar ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(sessao));
    } catch {
      // sem storage a sessão vale até recarregar a página
    }
  }
}

function lerSessao(): Sessao | null {
  try {
    const texto = localStorage.getItem(CHAVE) ?? sessionStorage.getItem(CHAVE);
    return texto ? (JSON.parse(texto) as Sessao) : null;
  } catch {
    return null;
  }
}