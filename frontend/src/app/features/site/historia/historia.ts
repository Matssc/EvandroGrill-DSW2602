import { Component } from '@angular/core';
import { Clock, Flame, ImageIcon, LucideAngularModule, Utensils } from 'lucide-angular';

/**
 * Foto do ambiente ou da churrasqueira. No Figma é um espaço reservado:
 * quando tiver a foto, ponha o arquivo em public/ e troque null pelo nome dele (ex.: 'ambiente.jpg').
 */
const FOTO_DO_AMBIENTE: string | null = null;

// Seção "Nossa história" (frame 15-1665)
@Component({
  selector: 'app-historia',
  imports: [LucideAngularModule],
  templateUrl: './historia.html',
  styleUrl: './historia.scss',
})
export class Historia {
  protected readonly foto = FOTO_DO_AMBIENTE;
  protected readonly imagem = ImageIcon;

  protected readonly diferenciais = [
    { icone: Flame, titulo: 'Brasa de verdade', texto: 'Carvão e paciência: nada de chapa.' },
    { icone: Utensils, titulo: 'Carnes selecionadas', texto: 'Cortes escolhidos e temperados na casa.' },
    { icone: Clock, titulo: 'Feito na hora', texto: 'Seu pedido sai quente, direto da grelha.' },
  ];
}
