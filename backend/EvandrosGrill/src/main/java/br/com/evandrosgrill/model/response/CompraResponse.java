package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Compra;
import br.com.evandrosgrill.model.enums.FormaPagamentoCompra;
import br.com.evandrosgrill.model.enums.MeioAVista;

import java.math.BigDecimal;
import java.time.LocalDate;

// Compra como a API devolve (com nomes da categoria e do cartão).
public record CompraResponse(
        Long id,
        LocalDate data,
        String descricao,
        BigDecimal valor,
        Long categoriaId,
        String categoriaNome,
        FormaPagamentoCompra formaPagamento,
        MeioAVista meioAVista,
        Long cartaoPjId,
        String cartaoPjApelido,
        String cartaoPjFinal
) {

    // Converte a entidade em resposta.
    public static CompraResponse de(Compra c) {
        boolean temCartao = c.getCartaoPj() != null;
        return new CompraResponse(
                c.getId(),
                c.getData(),
                c.getDescricao(),
                c.getValor(),
                c.getCategoria().getId(),
                c.getCategoria().getNome(),
                c.getFormaPagamento(),
                c.getMeioAVista(),
                temCartao ? c.getCartaoPj().getId() : null,
                temCartao ? c.getCartaoPj().getApelido() : null,
                temCartao ? c.getCartaoPj().getFinalCartao() : null);
    }
}
