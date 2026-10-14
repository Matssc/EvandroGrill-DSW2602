import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// Rotas que o back libera sem login: o login e o cardápio da landing page
const ROTAS_PUBLICAS = ['/auth/', '/publico/'];

// Coloca "Authorization: Bearer <token>" em toda chamada do painel.
// Se o back responder 401 (token vencido ou inválido), desloga e volta pro login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Nas rotas públicas o token não vai: um token vencido faria o back responder 401
  // até no cardápio do site, e quem só abriu a landing page cairia no login.
  if (ROTAS_PUBLICAS.some((rota) => req.url.startsWith(`${environment.apiUrl}${rota}`))) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.token();
  const pedido = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401 && token) {
        auth.sair();
      }
      return throwError(() => erro);
    }),
  );
};
