import { Component } from '@angular/core';
import { ImageIcon, Instagram as IconeInstagram, LucideAngularModule } from 'lucide-angular';
import { CONTATO, LINK_INSTAGRAM } from '../../../core/contato';

// Seção do Instagram (frame 15-2080). Os quatro posts são espaços reservados que levam pro perfil.
@Component({
  selector: 'app-instagram',
  imports: [LucideAngularModule],
  templateUrl: './instagram.html',
  styleUrl: './instagram.scss',
})
export class Instagram {
  protected readonly perfil = CONTATO.instagram;
  protected readonly link = LINK_INSTAGRAM;
  protected readonly icones = { ImageIcon, IconeInstagram };
  protected readonly posts = [1, 2, 3, 4];
}
