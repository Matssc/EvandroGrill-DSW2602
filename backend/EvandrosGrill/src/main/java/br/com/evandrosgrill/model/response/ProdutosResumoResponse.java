package br.com.evandrosgrill.model.response;

// "24 produtos · 21 aparecem no cardápio"
public record ProdutosResumoResponse(long total, long noSite) {
}
