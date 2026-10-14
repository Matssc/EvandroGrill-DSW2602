package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Produto;

import java.math.BigDecimal;

// Usado na landing page (sem login): só o que o cliente precisa ver
public record ProdutoPublicoResponse(
        Long id,
        String categoria,
        String nome,
        String descricao,
        BigDecimal preco,
        String fotoUrl,
        Boolean destaque
) {

    public static ProdutoPublicoResponse de(Produto p) {
        return new ProdutoPublicoResponse(
                p.getId(),
                p.getCategoria().getNome(),
                p.getNome(),
                p.getDescricao(),
                p.getPreco(),
                p.getFotoUrl(),
                p.getDestaque());
    }
}
