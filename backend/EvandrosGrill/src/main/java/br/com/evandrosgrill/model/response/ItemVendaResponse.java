package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.VendaItem;

import java.math.BigDecimal;

public record ItemVendaResponse(
        Long produtoId,
        String produtoNome,
        Integer quantidade,
        BigDecimal precoUnitario,
        BigDecimal subtotal
) {

    public static ItemVendaResponse de(VendaItem i) {
        return new ItemVendaResponse(
                i.getProduto().getId(),
                i.getProduto().getNome(),
                i.getQuantidade(),
                i.getPrecoUnitario(),
                i.getPrecoUnitario().multiply(BigDecimal.valueOf(i.getQuantidade())));
    }
}
