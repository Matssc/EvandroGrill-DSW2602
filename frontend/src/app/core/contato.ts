// Contato da espetaria num lugar só: a landing page inteira lê daqui.
// Endereço, telefone e horário são os do perfil da Evandro's Grill no Google.
export const CONTATO = {
  /** Só números, com o 55 do Brasil e o DDD: é o que vai no link do WhatsApp. */
  whatsapp: '5511967039052',
  whatsappNaTela: '(11) 96703-9052',
  instagram: 'espetariaevandrosgrill',
  endereco: 'R. Alziro de Oliveira, 2590 · casa 3',
  bairro: 'Res. Hípica Jaguari',
  cidade: 'Bragança Paulista · SP',
  cep: '12926-030',
  horarios: ['Segunda a sábado · 18h às 22h30', 'Domingo · fechado'],
};

/** Como o Google encontra a espetaria (nome + endereço) e o id do lugar no Google Maps. */
const NO_MAPA =
  "Espetaria artesanal Evandro's Grill, R. Alziro de Oliveira, 2590, Bragança Paulista - SP";
const ID_NO_GOOGLE = 'ChIJQ9LWP4_LzpQRq2rVoZKssWE';

export const LINK_INSTAGRAM = `https://www.instagram.com/${CONTATO.instagram}/`;

/** Link que abre a conversa no WhatsApp, já com a mensagem escrita. */
export function linkWhatsApp(mensagem = 'Oi! Quero fazer um pedido.'): string {
  return `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}


/** Rota até a espetaria no Google Maps. */
export function linkComoChegar(): string {
  const destino = encodeURIComponent(NO_MAPA);
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}&destination_place_id=${ID_NO_GOOGLE}`;
}

/** Mapa do Google pra colocar no site (iframe), sem precisar de chave da API. */
export function linkDoMapa(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(NO_MAPA)}&z=16&output=embed`;
}
