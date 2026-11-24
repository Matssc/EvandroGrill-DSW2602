import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raiz: só contém o <router-outlet>; cada tela é carregada pela rota.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}