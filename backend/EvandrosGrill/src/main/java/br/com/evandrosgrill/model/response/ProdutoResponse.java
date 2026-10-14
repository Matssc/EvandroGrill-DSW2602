package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Produto;

import java.math.BigDecimal;

// Usado no painel (tela "Produtos do site")
public record ProdutoResponse(
        Long id,
        Long categoriaId,
        String categoriaNome,
        String codigo,
        String nome,
        String descricao,
        BigDecimal preco,
        String fotoUrl,
        Boolean mostrarNoSite,
        Boolean destaque
) {

    public static ProdutoResponse de(Produto p) {
        return new ProdutoResponse(
                p.getId(),
                p.getCategoria().getId(),
                p.getCategoria().getNome(),
                p.getCodigo(),
                p.getNome(),
                p.getDescricao(),
                p.getPreco(),
                p.getFotoUrl(),
                p.getMostrarNoSite(),
                p.getDestaque());
    }
}
