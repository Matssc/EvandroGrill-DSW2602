import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// RN10: o painel inteiro exige login. Sem sessão, vai pro login e volta pra mesma tela depois.
export const authGuard: CanActivateFn = (_rota, estado) => {
  if (inject(AuthService).logado()) return true;
  return inject(Router).createUrlTree(['/admin/login'], { queryParams: { voltar: estado.url } });
};