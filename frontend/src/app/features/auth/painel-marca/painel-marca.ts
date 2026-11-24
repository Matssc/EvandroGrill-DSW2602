import { Component } from '@angular/core';
import { Brasas } from '../../../shared/brasas/brasas';

// Lado escuro do login: a logo em destaque com um brilho de brasa
// e as mesmas brasas subindo da landing page.
@Component({
  selector: 'app-painel-marca',
  imports: [Brasas],
  template: `
    <app-brasas />
    <div class="conteudo">
      <span class="logo">
        <img src="logo.jpg" alt="Evandro's Grill" width="260" height="260" />
      </span>
      <h2 class="t-display">Painel administrativo</h2>
      <p class="texto">
        Espetaria artesanal. Vendas do dia, compras, pró-labore e reserva da empresa num lugar só.
      </p>
    </div>
  `,
  styles: `
    :host {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 48px 32px;
      text-align: center;
      color: var(--creme);
      background: var(--carvao);
    }
    // brasas mais discretas que na landing, pra não brigar com o texto
    app-brasas {
      opacity: 0.6;
    }
    // logo e textos no centro do painel, acima das brasas
    .conteudo {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    // logo grande; diminui em tela baixa pra caber com o texto
    .logo {
      position: relative;
      display: block;
      width: min(260px, 60%, 36vh);
      margin-bottom: 28px;
    }
    .logo img {
      position: relative;
      display: block;
      width: 100%;
      height: auto;
      border-radius: 50%;
      box-shadow: 0 0 0 5px rgb(242 163 58 / 0.3);
    }
    // brilho de brasa atrás da logo, pulsando devagar (só o brilho anima, a logo fica firme)
    .logo::before {
      content: '';
      position: absolute;
      inset: -18%;
      border-radius: 50%;
      background: radial-gradient(closest-side, rgb(255 122 61 / 0.45), transparent);
      animation: brilhar 4s ease-in-out infinite;
    }
    h2 {
      font-size: 36px;
      line-height: 1;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .texto {
      max-width: 340px;
      font-size: 15px;
      color: var(--n-200);
    }
    @keyframes brilhar {
      50% {
        opacity: 0.55;
        transform: scale(0.96);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .logo::before {
        animation: none;
      }
    }
  `,
})
export class PainelMarca {}
