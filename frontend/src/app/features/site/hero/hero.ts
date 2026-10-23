import { Component } from '@angular/core';
import { linkComoChegar } from '../../../core/contato';
import { Brasas } from '../../../shared/brasas/brasas';
import { Espeto, Peca } from '../../../shared/espeto/espeto';
import { Revelar } from '../../../shared/revelar/revelar';

// Primeira dobra: título, botões e a churrasqueira com os dois espetos (frame 15-1533).
@Component({
  selector: 'app-hero',
  imports: [Espeto, Revelar, Brasas],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly comoChegar = linkComoChegar();

  // Os espetos da ilustração, como no Figma
  protected readonly espetoDeCima: Peca[] = ['carne', 'pimentao', 'carne', 'cebola', 'carne'];
  protected readonly espetoDeBaixo: Peca[] = ['frango', 'bacon', 'frango', 'queijo', 'frango'];
}
