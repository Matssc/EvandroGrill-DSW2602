package br.com.evandrosgrill.model.response;

import java.math.BigDecimal;
import java.util.List;

// Cards e "Por categoria" da tela Compras para o mês escolhido
public record ComprasResumoResponse(
        BigDecimal total,
        long quantidade,
        BigDecimal totalNoCartao,
        List<PorCartao> cartoes,
        AVista aVista,
        List<PorCategoria> categorias
) {

    public record PorCartao(Long cartaoId, String apelido, String finalCartao,
                            long quantidade, BigDecimal total, BigDecimal percentual) {
    }

    public record AVista(long quantidade, BigDecimal total, BigDecimal percentual) {
    }

    public record PorCategoria(Long categoriaId, String nome, BigDecimal total, BigDecimal percentual) {
    }
}
