import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CONTATO, linkComoChegar, linkDoMapa } from '../../../core/contato';
import { Revelar } from '../../../shared/revelar/revelar';

// Seção "Onde estamos" (frame 15-2121 do Figma), com o mapa do Google.
@Component({
  selector: 'app-onde-estamos',
  imports: [Revelar],
  templateUrl: './onde-estamos.html',
  styleUrl: './onde-estamos.scss',
})
export class OndeEstamos {
  protected readonly contato = CONTATO;
  protected readonly comoChegar = linkComoChegar();
  // O Angular só deixa um iframe abrir um endereço que a gente marcou como confiável
  protected readonly mapa = inject(DomSanitizer).bypassSecurityTrustResourceUrl(linkDoMapa());
}
