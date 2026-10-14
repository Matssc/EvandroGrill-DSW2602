// Planilhas em CSV no formato que o Excel em português abre direto:
// colunas separadas por ponto e vírgula, vírgula nos centavos e BOM pra acentuação.

/** 1120 vira "1120,00". */
export function numeroCsv(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

/** Monta o CSV e baixa no navegador com o nome dado (ex.: 'pro-labore-2026-10.csv'). */
export function baixarCsv(nomeDoArquivo: string, linhas: (string | number)[][]): void {
  const protegido = (celula: string | number) => {
    const texto = String(celula);
    return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const csv = '\uFEFF' + linhas.map((l) => l.map(protegido).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
