import type { Alignment, Borders, Cell, Fill, Font, Row, Worksheet } from 'exceljs';
import { CartaoPj, Categoria, Compra, GastoCartao, MeioAVista } from '../../core/models';

// Planilha .xlsx do relatório da contadora (RN09), com a cara do painel.
// A exceljs só é baixada quando alguém clica em "Planilha" (import dinâmico).

/** Cores do _tokens.scss, no formato que o Excel entende (ARGB). */
const COR = {
  carvao: 'FF17161C',
  carvao3: 'FF2E2B34',
  brasaEscura: 'FFA9271F',
  brasaClara: 'FFFBE7E4',
  creme: 'FFF5EFE6',
  branco: 'FFFFFFFF',
  n50: 'FFF7F6F4',
  n100: 'FFEFEDEA',
  n200: 'FFE3E0DC',
  n500: 'FF8E8983',
  n600: 'FF66615C',
  n900: 'FF1D1B1A',
};
const FONTE = 'Calibri';
const REAIS = '"R$" #,##0.00';
const PORCENTO = '0.0%';
const DATA = 'dd/mm/yyyy';

const MEIOS: Record<MeioAVista, string> = { PIX: 'Pix', DINHEIRO: 'Dinheiro', DEBITO: 'Débito' };

export interface DadosDoRelatorio {
  mes: string; // '2026-09'
  mesPorExtenso: string; // 'Setembro de 2026'
  negocio: string; // "Evandro's Grill"
  totais: { cartaoPj: number; aVista: number; compras: number };
  gastos: GastoCartao[];
  compras: Compra[];
  cartoes: CartaoPj[];
  categorias: Categoria[];
}

// ---- Estilos

function preenchimento(cor: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } };
}
function fonte(extra: Partial<Font> = {}): Partial<Font> {
  return { name: FONTE, size: 11, color: { argb: COR.n900 }, ...extra };
}
function bordaFina(cor = COR.n200): Partial<Borders> {
  const lado = { style: 'thin' as const, color: { argb: cor } };
  return { top: lado, bottom: lado, left: lado, right: lado };
}
function alinhar(horizontal: Alignment['horizontal'], extra: Partial<Alignment> = {}): Partial<Alignment> {
  return { horizontal, vertical: 'middle', ...extra };
}

/** Faixa escura do topo: título grande e subtítulo, ocupando todas as colunas. */
function cabecalhoDaAba(aba: Worksheet, colunas: number, titulo: string, subtitulo: string): void {
  aba.mergeCells(1, 1, 1, colunas);
  aba.mergeCells(2, 1, 2, colunas);
  const t = aba.getCell(1, 1);
  t.value = titulo;
  t.font = fonte({ size: 18, bold: true, color: { argb: COR.branco } });
  t.alignment = alinhar('left', { indent: 1 });
  const s = aba.getCell(2, 1);
  s.value = subtitulo;
  s.font = fonte({ size: 11, color: { argb: COR.creme } });
  s.alignment = alinhar('left', { indent: 1 });
  for (const linha of [1, 2]) {
    for (let c = 1; c <= colunas; c++) aba.getCell(linha, c).fill = preenchimento(COR.carvao);
  }
  aba.getRow(1).height = 36;
  aba.getRow(2).height = 22;
  aba.getRow(3).height = 10;
}

/** Linha de títulos de uma tabela: negrito, branco sobre carvão. */
function titulosDaTabela(linha: Row, titulos: string[], alinhamentos: Alignment['horizontal'][]): void {
  linha.height = 24;
  titulos.forEach((titulo, i) => {
    const cel = linha.getCell(i + 1);
    cel.value = titulo;
    cel.font = fonte({ bold: true, color: { argb: COR.branco } });
    cel.fill = preenchimento(COR.carvao3);
    cel.alignment = alinhar(alinhamentos[i], { indent: alinhamentos[i] === 'center' ? 0 : 1 });
    cel.border = bordaFina(COR.carvao3);
  });
}

/** Linha de dados com zebra, borda fina e o formato de cada coluna. */
function linhaDeDados(linha: Row, zebra: boolean, formatos: (string | null)[], alinhamentos: Alignment['horizontal'][]): void {
  linha.height = 20;
  formatos.forEach((formato, i) => {
    const cel = linha.getCell(i + 1);
    cel.font = fonte();
    cel.border = bordaFina();
    cel.alignment = alinhar(alinhamentos[i], { indent: alinhamentos[i] === 'center' ? 0 : 1 });
    if (formato) cel.numFmt = formato;
    if (zebra) cel.fill = preenchimento(COR.n50);
  });
}

/** Linha de total: negrito, fundo cinza e borda grossa em cima. */
function linhaDeTotal(linha: Row, colunas: number): void {
  linha.height = 22;
  for (let c = 1; c <= colunas; c++) {
    const cel = linha.getCell(c);
    cel.font = fonte({ bold: true });
    cel.fill = preenchimento(COR.n100);
    cel.border = { ...bordaFina(), top: { style: 'medium', color: { argb: COR.carvao3 } } };
  }
}

function tituloDeSecao(cel: Cell, texto: string): void {
  cel.value = texto;
  cel.font = fonte({ size: 13, bold: true });
  cel.alignment = alinhar('left');
}

function rodape(aba: Worksheet, linha: number, colunas: number, texto: string): void {
  aba.mergeCells(linha, 1, linha, colunas);
  const cel = aba.getCell(linha, 1);
  cel.value = texto;
  cel.font = fonte({ size: 9, italic: true, color: { argb: COR.n500 } });
}

/** A4, ajustado à largura da página, com o nome do arquivo no rodapé da impressão. */
function configurarImpressao(aba: Worksheet, paisagem: boolean, repetirAteLinha?: number): void {
  aba.pageSetup = {
    paperSize: 9,
    orientation: paisagem ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: repetirAteLinha ? `1:${repetirAteLinha}` : undefined,
  };
  aba.headerFooter.oddFooter = '&L&8&F&R&8Página &P de &N';
}

/** '2026-09-05' vira data do Excel (em UTC, pra não voltar um dia por causa do fuso). */
function dataExcel(texto: string): Date {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function hojeFormatado(): string {
  return new Date().toLocaleDateString('pt-BR');
}

// ---- Abas

/** Aba "Resumo": destaque do cartão PJ e a tabela por forma de pagamento. */
function abaResumo(aba: Worksheet, d: DadosDoRelatorio): void {
  aba.columns = [{ width: 46 }, { width: 13 }, { width: 20 }, { width: 14 }];
  aba.views = [{ showGridLines: false }];
  cabecalhoDaAba(aba, 4, 'Relatório da contadora', `${d.negocio} · Compras de ${d.mesPorExtenso.toLowerCase()}`);

  // Destaques
  const destaques: [string, number, boolean][] = [
    ['Total no cartão PJ (vai na declaração do Imposto de Renda)', d.totais.cartaoPj, true],
    ['Compras à vista (fora do cartão)', d.totais.aVista, false],
    ['Total de compras do mês', d.totais.compras, false],
  ];
  destaques.forEach(([rotulo, valor, principal], i) => {
    const n = 4 + i;
    aba.mergeCells(n, 1, n, 2);
    aba.mergeCells(n, 3, n, 4);
    const r = aba.getCell(n, 1);
    const v = aba.getCell(n, 3);
    r.value = rotulo;
    v.value = valor;
    v.numFmt = REAIS;
    r.alignment = alinhar('left', { indent: 1 });
    v.alignment = alinhar('right', { indent: 1 });
    aba.getRow(n).height = principal ? 30 : 22;
    if (principal) {
      r.font = fonte({ bold: true, color: { argb: COR.brasaEscura } });
      v.font = fonte({ size: 14, bold: true, color: { argb: COR.brasaEscura } });
      for (let c = 1; c <= 4; c++) aba.getCell(n, c).fill = preenchimento(COR.brasaClara);
    } else {
      r.font = fonte({ color: { argb: COR.n600 } });
      v.font = fonte({ bold: true });
    }
    for (let c = 1; c <= 4; c++) aba.getCell(n, c).border = { bottom: { style: 'thin', color: { argb: COR.n200 } } };
  });

  // Tabela por forma de pagamento
  aba.getRow(7).height = 12;
  tituloDeSecao(aba.getCell('A8'), 'Compras por forma de pagamento');
  aba.getRow(8).height = 24;
  const alinhamentos: Alignment['horizontal'][] = ['left', 'center', 'right', 'right'];
  titulosDaTabela(aba.getRow(9), ['Forma de pagamento', 'Compras', 'Valor', '% do total'], alinhamentos);

  const formas = [...d.gastos].sort(
    (a, b) => Number(a.formaPagamento === 'A_VISTA') - Number(b.formaPagamento === 'A_VISTA'),
  );
  formas.forEach((g, i) => {
    const linha = aba.getRow(10 + i);
    linha.values = [
      g.formaPagamento === 'CARTAO' ? `Cartão ${g.forma} · final ${g.finalCartao}` : 'À vista (Pix, dinheiro e débito)',
      g.qtdCompras,
      g.total,
      d.totais.compras ? g.total / d.totais.compras : 0,
    ];
    linhaDeDados(linha, i % 2 === 1, [null, '0', REAIS, PORCENTO], alinhamentos);
  });
  const total = aba.getRow(10 + formas.length);
  total.values = ['Total de compras', formas.reduce((n, g) => n + g.qtdCompras, 0), d.totais.compras, 1];
  linhaDeTotal(total, 4);
  total.getCell(1).alignment = alinhar('left', { indent: 1 });
  total.getCell(2).alignment = alinhar('center');
  total.getCell(3).numFmt = REAIS;
  total.getCell(4).numFmt = PORCENTO;
  total.getCell(3).alignment = alinhar('right', { indent: 1 });
  total.getCell(4).alignment = alinhar('right', { indent: 1 });

  rodape(aba, 12 + formas.length, 4, `Gerado em ${hojeFormatado()} pelo painel do ${d.negocio}. O detalhe de cada compra está na aba "Compras do mês".`);
  configurarImpressao(aba, false);
}

/** Aba "Compras do mês": uma linha por compra, com filtro e cabeçalho congelado. */
function abaCompras(aba: Worksheet, d: DadosDoRelatorio): void {
  aba.columns = [{ width: 13 }, { width: 38 }, { width: 22 }, { width: 14 }, { width: 28 }, { width: 17 }];
  aba.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  cabecalhoDaAba(aba, 6, 'Compras do mês', `${d.negocio} · ${d.mesPorExtenso} · ${d.compras.length} compras`);

  const alinhamentos: Alignment['horizontal'][] = ['center', 'left', 'left', 'left', 'left', 'right'];
  titulosDaTabela(aba.getRow(4), ['Data', 'Descrição', 'Categoria', 'Pagamento', 'Cartão ou meio', 'Valor'], alinhamentos);

  const cartao = (id: number | null) => d.cartoes.find((k) => k.id === id);
  const categoria = (id: number) => d.categorias.find((c) => c.id === id)?.nome ?? '';
  // Cartões primeiro (pelo apelido), à vista no fim; dentro de cada um, por data
  const ordem = (c: Compra) => (c.formaPagamento === 'CARTAO' ? `0 ${cartao(c.cartaoPjId)?.apelido ?? ''}` : '1');
  const compras = [...d.compras].sort((a, b) => ordem(a).localeCompare(ordem(b)) || a.data.localeCompare(b.data));

  compras.forEach((c, i) => {
    const k = cartao(c.cartaoPjId);
    const linha = aba.getRow(5 + i);
    linha.values = [
      dataExcel(c.data),
      c.descricao,
      categoria(c.categoriaId),
      c.formaPagamento === 'CARTAO' ? 'Cartão PJ' : 'À vista',
      c.formaPagamento === 'CARTAO' ? `${k?.apelido ?? 'Cartão'} · final ${k?.finalCartao ?? ''}` : (MEIOS[c.meioAVista!] ?? ''),
      c.valor,
    ];
    linhaDeDados(linha, i % 2 === 1, [DATA, null, null, null, null, REAIS], alinhamentos);
  });

  const ultima = 4 + compras.length;
  if (compras.length) aba.autoFilter = { from: { row: 4, column: 1 }, to: { row: ultima, column: 6 } };
  const total = aba.getRow(ultima + 1);
  total.getCell(1).value = 'Total';
  total.getCell(6).value = { formula: `SUM(F5:F${ultima})`, result: d.totais.compras };
  linhaDeTotal(total, 6);
  total.getCell(1).alignment = alinhar('center');
  total.getCell(6).numFmt = REAIS;
  total.getCell(6).alignment = alinhar('right', { indent: 1 });

  rodape(aba, ultima + 3, 6, `Gerado em ${hojeFormatado()} pelo painel do ${d.negocio}. Use o filtro do cabeçalho pra ver um cartão de cada vez.`);
  configurarImpressao(aba, true, 4);
}

/** Monta o .xlsx e baixa no navegador. */
export async function baixarRelatorioContadora(d: DadosDoRelatorio): Promise<void> {
  const modulo = await import('exceljs');
  const { Workbook } = ('default' in modulo ? modulo.default : modulo) as typeof modulo;

  const planilha = new Workbook();
  planilha.creator = d.negocio;
  planilha.created = new Date();
  planilha.title = `Relatório da contadora · ${d.mesPorExtenso}`;

  abaResumo(planilha.addWorksheet('Resumo', { properties: { tabColor: { argb: COR.brasaEscura } } }), d);
  abaCompras(planilha.addWorksheet('Compras do mês', { properties: { tabColor: { argb: COR.carvao3 } } }), d);

  const conteudo = await planilha.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([conteudo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-contadora-${d.mes}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
