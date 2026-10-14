package br.com.evandrosgrill.model.response;

import java.math.BigDecimal;

// Ranking dos produtos: quantos saíram e quanto deram no período
public record MaisVendidoResponse(
        Long produtoId,
        String nome,
        long quantidade,
        BigDecimal total
) {
}
