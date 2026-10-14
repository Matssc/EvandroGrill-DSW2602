import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Tela provisória: aparece em toda rota que ainda não tem componente (veja app.routes.ts).
@Component({
  selector: 'app-em-construcao',
  imports: [RouterLink],
  template: `
    <section class="painel em-construcao">
      <span class="badge badge-alerta">Em construção</span>
      <h1 class="t-h1">{{ titulo() }}</h1>
      <p class="t-sub">Essa tela ainda não foi feita. O layout dela está no Figma.</p>
      <div class="acoes">
        <a class="btn btn-primario" [href]="linkFigma()" target="_blank" rel="noopener">Abrir o frame no Figma</a>
        <a class="btn btn-secundario" routerLink="/admin/vendas">Ir pra Vendas do dia</a>
      </div>
    </section>
  `,
  styles: `
    .em-construcao { max-width: 560px; margin: 48px auto; display: grid; gap: 12px; justify-items: start; }
    .acoes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  `,
})
export class EmConstrucao {
  // vêm do "data" da rota, graças ao withComponentInputBinding() do app.config.ts
  readonly titulo = input('Em construção');
  readonly figma = input('');

  protected readonly linkFigma = computed(
    () => `https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=${this.figma()}`,
  );
}