import { Component } from '@angular/core';
import { Flame, Instagram, LucideAngularModule, Utensils } from 'lucide-angular';
import { LINK_INSTAGRAM, linkWhatsApp } from '../../../core/contato';
import { Espeto, Peca } from '../../../shared/espeto/espeto';
import { IconeWhatsapp } from '../../../shared/icone-whatsapp/icone-whatsapp';

// Primeira dobra: título, botões e a churrasqueira com os dois espetos (frame 15-1533).
@Component({
  selector: 'app-hero',
  imports: [LucideAngularModule, IconeWhatsapp, Espeto],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly whatsapp = linkWhatsApp();
  protected readonly instagram = LINK_INSTAGRAM;
  protected readonly icones = { Flame, Instagram, Utensils };

  // Os espetos da ilustração, como no Figma
  protected readonly espetoDeCima: Peca[] = ['carne', 'pimentao', 'carne', 'cebola', 'carne'];
  protected readonly espetoDeBaixo: Peca[] = ['frango', 'bacon', 'frango', 'queijo', 'frango'];
}
