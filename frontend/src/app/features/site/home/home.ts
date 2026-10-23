import { Component } from '@angular/core';
import { BateuAFome } from '../bateu-a-fome/bateu-a-fome';
import { Cardapio } from '../cardapio/cardapio';
import { Faixa } from '../faixa/faixa';
import { Hero } from '../hero/hero';
import { Historia } from '../historia/historia';
import { Instagram } from '../instagram/instagram';
import { OndeEstamos } from '../onde-estamos/onde-estamos';
import { Rodape } from '../rodape/rodape';
import { Topo } from '../topo/topo';

// Landing page (rota /, sem login). Cada seção do Figma é um componente desta pasta.
// Figma: computador https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=15-1514
//        celular    https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=10-1514
@Component({
  selector: 'app-home',
  imports: [Topo, Hero, Faixa, Historia, Cardapio, Instagram, OndeEstamos, BateuAFome, Rodape],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
